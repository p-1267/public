/*
  # Task Automation RPC Functions

  1. Automation Functions
    - `auto_escalate_overdue_tasks` - Escalate tasks past deadline
    - `generate_recurring_tasks` - Create tasks from schedules
    - `detect_meal_patterns` - Find multi-day meal patterns
    - `generate_handoff_summary` - Create shift handoff

  2. Scheduler Integration
    - These functions should be called by external schedulers (cron/pg_cron)
    - Run every 5-15 minutes
*/

CREATE OR REPLACE FUNCTION auto_escalate_overdue_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
  v_policy record;
  v_escalated_count integer := 0;
  v_overdue_minutes integer;
BEGIN
  FOR v_task IN 
    SELECT t.*, tc.escalation_minutes
    FROM tasks t
    INNER JOIN task_categories tc ON t.category_id = tc.id
    WHERE t.state IN ('due', 'overdue')
      AND t.scheduled_end < now()
      AND t.escalation_level < 3
  LOOP
    v_overdue_minutes := EXTRACT(EPOCH FROM (now() - v_task.scheduled_end)) / 60;
    
    SELECT * INTO v_policy
    FROM escalation_policies
    WHERE (category_id = v_task.category_id OR category_id IS NULL)
      AND (risk_level = v_task.risk_level OR risk_level IS NULL)
      AND is_active = true
      AND overdue_minutes <= v_overdue_minutes
    ORDER BY overdue_minutes DESC
    LIMIT 1;
    
    IF FOUND THEN
      IF v_task.state != 'escalated' THEN
        UPDATE tasks 
        SET 
          state = 'escalated',
          escalation_level = escalation_level + 1,
          escalated_at = now(),
          updated_at = now()
        WHERE id = v_task.id;
        
        INSERT INTO task_state_transitions (task_id, from_state, to_state, transition_reason, transitioned_by)
        VALUES (
          v_task.id, 
          v_task.state, 
          'escalated',
          format('Auto-escalated: %s minutes overdue', v_overdue_minutes),
          v_task.created_by
        );
      ELSE
        UPDATE tasks 
        SET 
          escalation_level = escalation_level + 1,
          escalated_at = now(),
          updated_at = now()
        WHERE id = v_task.id;
      END IF;
      
      INSERT INTO task_escalations (
        task_id, 
        policy_id, 
        escalation_level, 
        escalation_reason
      )
      VALUES (
        v_task.id,
        v_policy.id,
        v_task.escalation_level + 1,
        format('Task overdue by %s minutes', v_overdue_minutes)
      );
      
      v_escalated_count := v_escalated_count + 1;
    END IF;
  END LOOP;
  
  FOR v_task IN 
    SELECT t.*
    FROM tasks t
    WHERE t.state = 'due'
      AND t.scheduled_end < now()
      AND t.state != 'overdue'
  LOOP
    UPDATE tasks SET state = 'overdue', updated_at = now() WHERE id = v_task.id;
    
    INSERT INTO task_state_transitions (task_id, from_state, to_state, transition_reason, transitioned_by)
    VALUES (
      v_task.id, 
      'due', 
      'overdue',
      'Task passed scheduled end time',
      v_task.created_by
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'escalated_count', v_escalated_count,
    'timestamp', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION generate_recurring_tasks(
  p_lookahead_days integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule record;
  v_template record;
  v_task_date date;
  v_task_time time;
  v_created_count integer := 0;
  v_task_id uuid;
  v_day_of_week integer;
  v_should_create boolean;
BEGIN
  FOR v_schedule IN 
    SELECT ts.*, tt.*
    FROM task_schedules ts
    INNER JOIN task_templates tt ON ts.template_id = tt.id
    WHERE ts.is_active = true
      AND (ts.ends_on IS NULL OR ts.ends_on >= CURRENT_DATE)
      AND ts.starts_on <= CURRENT_DATE + p_lookahead_days
  LOOP
    FOR i IN 0..p_lookahead_days LOOP
      v_task_date := CURRENT_DATE + i;
      v_should_create := false;
      
      IF v_schedule.recurrence_pattern = 'daily' THEN
        v_should_create := true;
      ELSIF v_schedule.recurrence_pattern = 'weekly' THEN
        v_day_of_week := EXTRACT(ISODOW FROM v_task_date);
        IF v_schedule.recurrence_config ? 'days_of_week' THEN
          v_should_create := (v_schedule.recurrence_config->'days_of_week')::jsonb ? v_day_of_week::text;
        END IF;
      END IF;
      
      IF v_should_create THEN
        v_task_time := COALESCE(v_schedule.time_window_start, '08:00'::time);
        
        IF NOT EXISTS (
          SELECT 1 FROM tasks 
          WHERE template_id = v_schedule.template_id
            AND resident_id = v_schedule.resident_id
            AND scheduled_start::date = v_task_date
        ) THEN
          INSERT INTO tasks (
            agency_id,
            resident_id,
            category_id,
            template_id,
            task_name,
            description,
            priority,
            risk_level,
            state,
            scheduled_start,
            scheduled_end,
            duration_minutes,
            requires_evidence,
            is_recurring,
            created_by
          )
          VALUES (
            v_schedule.agency_id,
            v_schedule.resident_id,
            v_schedule.category_id,
            v_schedule.template_id,
            v_schedule.template_name,
            v_schedule.description,
            v_schedule.default_priority,
            v_schedule.default_risk_level,
            'scheduled',
            v_task_date + v_task_time,
            v_task_date + v_task_time + (COALESCE(v_schedule.default_duration_minutes, 30) || ' minutes')::interval,
            v_schedule.default_duration_minutes,
            v_schedule.requires_certification,
            true,
            v_schedule.created_by
          )
          RETURNING id INTO v_task_id;
          
          v_created_count := v_created_count + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'timestamp', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION detect_meal_patterns(
  p_lookback_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident record;
  v_missed_count integer;
  v_low_intake_count integer;
  v_pattern_id uuid;
  v_detected_count integer := 0;
BEGIN
  FOR v_resident IN 
    SELECT r.id, r.full_name, r.agency_id
    FROM residents r
    WHERE r.status = 'active'
  LOOP
    SELECT COUNT(*) INTO v_missed_count
    FROM meal_logs ml
    WHERE ml.resident_id = v_resident.id
      AND ml.meal_time >= (CURRENT_DATE - p_lookback_days)
      AND (ml.intake_percent = 0 OR ml.refusal_reason IS NOT NULL);
    
    SELECT COUNT(*) INTO v_low_intake_count
    FROM meal_logs ml
    WHERE ml.resident_id = v_resident.id
      AND ml.meal_time >= (CURRENT_DATE - p_lookback_days)
      AND ml.intake_percent < 50
      AND ml.intake_percent > 0;
    
    IF v_missed_count >= 3 THEN
      IF NOT EXISTS (
        SELECT 1 FROM pattern_alerts
        WHERE resident_id = v_resident.id
          AND pattern_type = 'missed_meals'
          AND status = 'active'
      ) THEN
        INSERT INTO pattern_alerts (
          resident_id,
          pattern_type,
          detection_period_days,
          occurrences_count,
          pattern_data,
          severity
        )
        VALUES (
          v_resident.id,
          'missed_meals',
          p_lookback_days,
          v_missed_count,
          jsonb_build_object(
            'missed_meals', v_missed_count,
            'low_intake_meals', v_low_intake_count,
            'period_days', p_lookback_days
          ),
          CASE 
            WHEN v_missed_count >= 6 THEN 'critical'
            WHEN v_missed_count >= 4 THEN 'high'
            ELSE 'medium'
          END
        )
        RETURNING id INTO v_pattern_id;
        
        v_detected_count := v_detected_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'detected_count', v_detected_count,
    'lookback_days', p_lookback_days,
    'timestamp', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION generate_handoff_summary(
  p_shift_id uuid DEFAULT NULL,
  p_from_user_id uuid DEFAULT NULL,
  p_to_user_id uuid DEFAULT NULL,
  p_hours_back integer DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary_id uuid;
  v_time_start timestamptz := now() - (p_hours_back || ' hours')::interval;
  v_time_end timestamptz := now();
  v_agency_id uuid;
  v_tasks_completed jsonb;
  v_tasks_pending jsonb;
  v_tasks_overdue jsonb;
  v_warnings jsonb;
BEGIN
  SELECT agency_id INTO v_agency_id FROM shifts WHERE id = p_shift_id;
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'task_name', t.task_name,
      'resident_name', r.full_name,
      'completed_at', t.actual_end,
      'outcome', t.outcome
    )
  ) INTO v_tasks_completed
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  WHERE t.state = 'completed'
    AND t.actual_end >= v_time_start
    AND t.actual_end <= v_time_end
    AND (p_from_user_id IS NULL OR t.owner_user_id = p_from_user_id);
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'task_name', t.task_name,
      'resident_name', r.full_name,
      'scheduled_start', t.scheduled_start,
      'priority', t.priority,
      'state', t.state
    )
  ) INTO v_tasks_pending
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  WHERE t.state IN ('due', 'scheduled', 'in_progress')
    AND t.scheduled_start >= v_time_start
    AND (p_from_user_id IS NULL OR t.owner_user_id = p_from_user_id);
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'task_name', t.task_name,
      'resident_name', r.full_name,
      'scheduled_end', t.scheduled_end,
      'overdue_minutes', EXTRACT(EPOCH FROM (now() - t.scheduled_end)) / 60,
      'escalation_level', t.escalation_level
    )
  ) INTO v_tasks_overdue
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  WHERE t.state IN ('overdue', 'escalated')
    AND (p_from_user_id IS NULL OR t.owner_user_id = p_from_user_id);
  
  SELECT jsonb_agg(
    jsonb_build_object(
      'task_id', tw.task_id,
      'warning_type', tw.warning_type,
      'severity', tw.severity,
      'message', tw.message,
      'created_at', tw.created_at
    )
  ) INTO v_warnings
  FROM task_warnings tw
  INNER JOIN tasks t ON tw.task_id = t.id
  WHERE tw.is_acknowledged = false
    AND tw.created_at >= v_time_start
    AND (p_from_user_id IS NULL OR t.owner_user_id = p_from_user_id);
  
  INSERT INTO handoff_summaries (
    agency_id,
    shift_id,
    handoff_type,
    from_user_id,
    to_user_id,
    time_period_start,
    time_period_end,
    tasks_completed,
    tasks_pending,
    tasks_overdue,
    warnings,
    auto_generated
  )
  VALUES (
    v_agency_id,
    p_shift_id,
    'shift_change',
    p_from_user_id,
    p_to_user_id,
    v_time_start,
    v_time_end,
    COALESCE(v_tasks_completed, '[]'::jsonb),
    COALESCE(v_tasks_pending, '[]'::jsonb),
    COALESCE(v_tasks_overdue, '[]'::jsonb),
    COALESCE(v_warnings, '[]'::jsonb),
    true
  )
  RETURNING id INTO v_summary_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'summary_id', v_summary_id,
    'time_period_start', v_time_start,
    'time_period_end', v_time_end,
    'tasks_completed_count', jsonb_array_length(COALESCE(v_tasks_completed, '[]'::jsonb)),
    'tasks_pending_count', jsonb_array_length(COALESCE(v_tasks_pending, '[]'::jsonb)),
    'tasks_overdue_count', jsonb_array_length(COALESCE(v_tasks_overdue, '[]'::jsonb))
  );
END;
$$;
