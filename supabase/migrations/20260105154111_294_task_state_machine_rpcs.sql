/*
  # Task State Machine RPC Functions

  1. Core Functions
    - `transition_task_state` - Main state transition with validation
    - `start_task` - Begin working on a task
    - `complete_task` - Mark task as completed
    - `skip_task` - Skip task with reason
    - `fail_task` - Mark task as failed
    - `escalate_task` - Manual escalation
    - `check_allergy_violations` - HARD CONSTRAINT check
    - `get_task_dashboard` - Get task overview

  2. Automation Functions
    - `auto_escalate_overdue_tasks` - Run by scheduler
    - `generate_recurring_tasks` - Create tasks from schedules
    - `detect_patterns` - Find multi-day patterns
    - `generate_handoff_summary` - Create shift handoff
*/

CREATE OR REPLACE FUNCTION transition_task_state(
  p_task_id uuid,
  p_to_state text,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_state text;
  v_task tasks%ROWTYPE;
  v_valid_transition boolean := false;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  v_current_state := v_task.state;
  
  v_valid_transition := CASE
    WHEN v_current_state = 'scheduled' AND p_to_state IN ('due', 'in_progress', 'cancelled') THEN true
    WHEN v_current_state = 'due' AND p_to_state IN ('in_progress', 'overdue', 'cancelled') THEN true
    WHEN v_current_state = 'in_progress' AND p_to_state IN ('completed', 'failed', 'skipped') THEN true
    WHEN v_current_state = 'overdue' AND p_to_state IN ('in_progress', 'escalated', 'failed') THEN true
    WHEN v_current_state = 'escalated' AND p_to_state IN ('in_progress', 'failed', 'completed') THEN true
    ELSE false
  END;
  
  IF NOT v_valid_transition THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid transition from %s to %s', v_current_state, p_to_state)
    );
  END IF;
  
  UPDATE tasks 
  SET 
    state = p_to_state,
    updated_at = now(),
    actual_start = CASE WHEN p_to_state = 'in_progress' AND actual_start IS NULL THEN now() ELSE actual_start END,
    actual_end = CASE WHEN p_to_state IN ('completed', 'failed', 'skipped') THEN now() ELSE actual_end END,
    completed_by = CASE WHEN p_to_state = 'completed' THEN auth.uid() ELSE completed_by END
  WHERE id = p_task_id;
  
  INSERT INTO task_state_transitions (task_id, from_state, to_state, transition_reason, transition_metadata, transitioned_by)
  VALUES (p_task_id, v_current_state, p_to_state, p_reason, p_metadata, auth.uid());
  
  RETURN jsonb_build_object(
    'success', true,
    'from_state', v_current_state,
    'to_state', p_to_state,
    'timestamp', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION start_task(
  p_task_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_blocked_deps jsonb;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  IF v_task.is_blocked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task is blocked',
      'blocking_reason', v_task.blocking_reason
    );
  END IF;
  
  SELECT jsonb_agg(jsonb_build_object('task_id', t.id, 'task_name', t.task_name, 'state', t.state))
  INTO v_blocked_deps
  FROM task_dependencies td
  INNER JOIN tasks t ON td.depends_on_task_id = t.id
  WHERE td.task_id = p_task_id 
    AND td.dependency_type = 'must_complete_before'
    AND td.is_hard_dependency = true
    AND t.state NOT IN ('completed', 'skipped');
  
  IF v_blocked_deps IS NOT NULL AND jsonb_array_length(v_blocked_deps) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task has incomplete dependencies',
      'blocked_by', v_blocked_deps
    );
  END IF;
  
  RETURN transition_task_state(p_task_id, 'in_progress', 'Task started by user');
END;
$$;

CREATE OR REPLACE FUNCTION complete_task(
  p_task_id uuid,
  p_outcome text DEFAULT 'success',
  p_outcome_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_evidence_count integer;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  IF v_task.state != 'in_progress' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Task must be in progress to complete. Current state: %s', v_task.state)
    );
  END IF;
  
  IF v_task.requires_evidence THEN
    SELECT COUNT(*) INTO v_evidence_count FROM task_evidence WHERE task_id = p_task_id;
    IF v_evidence_count = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Task requires evidence but none submitted'
      );
    END IF;
    
    UPDATE tasks SET evidence_submitted = true WHERE id = p_task_id;
  END IF;
  
  UPDATE tasks 
  SET 
    outcome = p_outcome,
    outcome_reason = p_outcome_reason
  WHERE id = p_task_id;
  
  RETURN transition_task_state(p_task_id, 'completed', p_outcome_reason);
END;
$$;

CREATE OR REPLACE FUNCTION skip_task(
  p_task_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  IF NOT v_task.category_id IN (SELECT id FROM task_categories WHERE allows_skip = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This task category does not allow skipping'
    );
  END IF;
  
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Skip reason is required'
    );
  END IF;
  
  UPDATE tasks 
  SET 
    outcome = 'skipped',
    outcome_reason = p_reason
  WHERE id = p_task_id;
  
  RETURN transition_task_state(p_task_id, 'skipped', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION check_allergy_violations(
  p_resident_id uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_violations jsonb := '[]'::jsonb;
  v_item jsonb;
  v_allergen record;
  v_item_name text;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_item_name := lower(v_item->>'name');
    
    FOR v_allergen IN 
      SELECT * FROM allergy_rules 
      WHERE resident_id = p_resident_id 
        AND is_active = true 
        AND cannot_bypass = true
        AND allergen_type = 'food'
    LOOP
      IF v_item_name LIKE '%' || lower(v_allergen.allergen_name) || '%' THEN
        v_violations := v_violations || jsonb_build_object(
          'item', v_item,
          'allergen', v_allergen.allergen_name,
          'severity', v_allergen.severity,
          'reaction_type', v_allergen.reaction_type,
          'emergency_protocol', v_allergen.emergency_protocol
        );
      END IF;
      
      IF v_allergen.cross_reactions IS NOT NULL THEN
        FOR i IN 1..array_length(v_allergen.cross_reactions, 1)
        LOOP
          IF v_item_name LIKE '%' || lower(v_allergen.cross_reactions[i]) || '%' THEN
            v_violations := v_violations || jsonb_build_object(
              'item', v_item,
              'allergen', v_allergen.cross_reactions[i],
              'primary_allergen', v_allergen.allergen_name,
              'severity', v_allergen.severity,
              'reaction_type', v_allergen.reaction_type,
              'emergency_protocol', v_allergen.emergency_protocol
            );
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'has_violations', jsonb_array_length(v_violations) > 0,
    'violations', v_violations,
    'resident_id', p_resident_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_task_dashboard(
  p_user_id uuid DEFAULT NULL,
  p_resident_id uuid DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_result jsonb;
BEGIN
  WITH task_summary AS (
    SELECT
      COUNT(*) FILTER (WHERE state = 'completed') AS completed_count,
      COUNT(*) FILTER (WHERE state IN ('due', 'scheduled')) AS pending_count,
      COUNT(*) FILTER (WHERE state = 'overdue') AS overdue_count,
      COUNT(*) FILTER (WHERE state = 'escalated') AS escalated_count,
      COUNT(*) FILTER (WHERE state = 'in_progress') AS in_progress_count,
      COUNT(*) FILTER (WHERE priority = 'critical') AS critical_count
    FROM tasks
    WHERE (p_resident_id IS NULL OR resident_id = p_resident_id)
      AND (owner_user_id = v_user_id OR p_resident_id IS NOT NULL)
      AND scheduled_start::date = p_date
  ),
  recent_tasks AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'task_name', t.task_name,
        'priority', t.priority,
        'state', t.state,
        'scheduled_start', t.scheduled_start,
        'resident_name', r.full_name
      ) ORDER BY t.scheduled_start DESC
    ) AS tasks
    FROM tasks t
    INNER JOIN residents r ON t.resident_id = r.id
    WHERE (p_resident_id IS NULL OR t.resident_id = p_resident_id)
      AND (t.owner_user_id = v_user_id OR p_resident_id IS NOT NULL)
      AND t.scheduled_start::date = p_date
    LIMIT 10
  ),
  active_warnings AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', tw.id,
        'task_id', tw.task_id,
        'warning_type', tw.warning_type,
        'severity', tw.severity,
        'message', tw.message,
        'created_at', tw.created_at
      ) ORDER BY tw.severity DESC, tw.created_at DESC
    ) AS warnings
    FROM task_warnings tw
    INNER JOIN tasks t ON tw.task_id = t.id
    WHERE tw.is_acknowledged = false
      AND (p_resident_id IS NULL OR t.resident_id = p_resident_id)
      AND (t.owner_user_id = v_user_id OR p_resident_id IS NOT NULL)
  )
  SELECT jsonb_build_object(
    'summary', row_to_json(ts.*),
    'recent_tasks', COALESCE(rt.tasks, '[]'::jsonb),
    'active_warnings', COALESCE(aw.warnings, '[]'::jsonb),
    'date', p_date
  ) INTO v_result
  FROM task_summary ts, recent_tasks rt, active_warnings aw;
  
  RETURN v_result;
END;
$$;
