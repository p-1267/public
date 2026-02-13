/*
  # Fix Clinician Review RPC Schema

  Fix column names to match actual tasks table schema (task_name instead of title).
*/

DROP FUNCTION IF EXISTS request_clinician_review(uuid, text, text);

CREATE OR REPLACE FUNCTION request_clinician_review(
  p_task_id uuid,
  p_reason text,
  p_urgency text DEFAULT 'medium'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id uuid;
  v_task record;
  v_resident_id uuid;
  v_agency_id uuid;
BEGIN
  IF p_urgency NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid urgency level. Must be: low, medium, high, or critical';
  END IF;

  SELECT t.*, t.resident_id, t.agency_id
  INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  v_resident_id := v_task.resident_id;
  v_agency_id := v_task.agency_id;

  INSERT INTO supervisor_reviews (
    task_id,
    department_id,
    reviewer_id,
    review_status,
    review_decision,
    reviewer_comments,
    escalated_to,
    escalation_reason,
    reviewed_at,
    metadata
  )
  VALUES (
    p_task_id,
    v_task.department_id,
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'escalated',
    'CLINICIAN_REVIEW_REQUESTED',
    p_reason,
    NULL,
    p_reason,
    now(),
    jsonb_build_object(
      'urgency', p_urgency,
      'escalated_at', now(),
      'escalation_type', 'CLINICIAN'
    )
  )
  ON CONFLICT (task_id) DO UPDATE SET
    review_status = 'escalated',
    review_decision = 'CLINICIAN_REVIEW_REQUESTED',
    escalation_reason = p_reason,
    reviewed_at = now(),
    metadata = supervisor_reviews.metadata || jsonb_build_object(
      'urgency', p_urgency,
      'escalated_at', now(),
      'escalation_type', 'CLINICIAN'
    ),
    updated_at = now()
  RETURNING id INTO v_review_id;

  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    metadata
  )
  VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'ESCALATE_TO_CLINICIAN',
    'supervisor_reviews',
    v_review_id,
    NULL,
    jsonb_build_object('task_id', p_task_id, 'reason', p_reason, 'urgency', p_urgency),
    jsonb_build_object(
      'resident_id', v_resident_id,
      'task_name', v_task.task_name,
      'urgency', p_urgency
    )
  );

  INSERT INTO notification_log (
    user_id,
    recipient_type,
    notification_type,
    title,
    message,
    priority,
    related_entity_type,
    related_entity_id,
    metadata,
    status
  )
  SELECT
    rp.physician_id,
    'PHYSICIAN',
    'ESCALATION_ALERT',
    'Clinician Review Requested: ' || v_task.task_name,
    'Supervisor has escalated a care task for clinical review. Reason: ' || p_reason,
    CASE p_urgency
      WHEN 'critical' THEN 'high'
      WHEN 'high' THEN 'high'
      WHEN 'medium' THEN 'medium'
      ELSE 'low'
    END,
    'task',
    p_task_id,
    jsonb_build_object(
      'resident_id', v_resident_id,
      'task_id', p_task_id,
      'urgency', p_urgency,
      'review_id', v_review_id
    ),
    'pending'
  FROM resident_physicians rp
  WHERE rp.resident_id = v_resident_id
  AND rp.is_primary = true
  LIMIT 1;

  INSERT INTO notification_log (
    user_id,
    recipient_type,
    notification_type,
    title,
    message,
    priority,
    related_entity_type,
    related_entity_id,
    metadata,
    status
  )
  SELECT
    frl.family_user_id,
    'FAMILY',
    'ESCALATION_ALERT',
    'Care Escalation: Clinician Notified',
    'A care task has been escalated to your loved one''s physician for review.',
    CASE p_urgency
      WHEN 'critical' THEN 'high'
      WHEN 'high' THEN 'high'
      ELSE 'medium'
    END,
    'task',
    p_task_id,
    jsonb_build_object(
      'resident_id', v_resident_id,
      'task_id', p_task_id,
      'urgency', p_urgency
    ),
    'pending'
  FROM family_resident_links frl
  WHERE frl.resident_id = v_resident_id
  AND frl.relationship_type = 'PRIMARY_CONTACT';

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'status', 'escalated',
    'message', 'Clinician review requested successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION request_clinician_review TO authenticated, anon;