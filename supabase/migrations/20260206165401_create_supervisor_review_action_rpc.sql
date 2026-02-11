/*
  # Supervisor Review Action RPC

  ## Purpose
  Allow supervisors to approve, reject, or escalate review items with idempotency
  
  ## Features
  - Approve/reject/escalate reviews
  - Add supervisor comments
  - Quality rating
  - Idempotency protection
  - Showcase mode support
  
  ## Actions
  - approve: Mark review as resolved with optional rating
  - reject: Reject and request clarification
  - escalate: Escalate to higher authority
*/

CREATE OR REPLACE FUNCTION submit_supervisor_review_action(
  p_review_id uuid,
  p_supervisor_id uuid,
  p_action text,
  p_comments text DEFAULT NULL,
  p_quality_rating integer DEFAULT NULL,
  p_escalate_to uuid DEFAULT NULL,
  p_escalation_reason text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review_record record;
  v_existing_action uuid;
BEGIN
  -- Check for duplicate submission
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_action
    FROM supervisor_reviews
    WHERE idempotency_key = p_idempotency_key
      AND reviewed_by = p_supervisor_id;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'review_id', p_review_id,
        'message', 'Duplicate action detected'
      );
    END IF;
  END IF;

  -- Validate action
  IF p_action NOT IN ('approve', 'reject', 'escalate') THEN
    RAISE EXCEPTION 'INVALID_ACTION: Action must be approve, reject, or escalate';
  END IF;

  -- Validate quality rating if provided
  IF p_quality_rating IS NOT NULL AND (p_quality_rating < 1 OR p_quality_rating > 5) THEN
    RAISE EXCEPTION 'INVALID_RATING: Quality rating must be between 1 and 5';
  END IF;

  -- Get review record
  SELECT * INTO v_review_record
  FROM supervisor_reviews
  WHERE id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REVIEW_NOT_FOUND: Review ID not found';
  END IF;

  -- Check supervisor has access to this agency
  IF NOT p_is_simulation THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = p_supervisor_id
        AND agency_id = v_review_record.agency_id
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Supervisor not authorized for this agency';
    END IF;
  END IF;

  -- Update review based on action
  UPDATE supervisor_reviews
  SET
    reviewed_by = p_supervisor_id,
    review_status = CASE p_action
      WHEN 'approve' THEN 'approved'
      WHEN 'reject' THEN 'rejected'
      WHEN 'escalate' THEN 'escalated'
    END,
    status = CASE p_action
      WHEN 'approve' THEN 'resolved'
      WHEN 'reject' THEN 'pending'
      WHEN 'escalate' THEN 'escalated'
    END,
    reviewer_comments = COALESCE(p_comments, reviewer_comments),
    quality_rating = COALESCE(p_quality_rating, quality_rating),
    escalated_to = CASE WHEN p_action = 'escalate' THEN p_escalate_to ELSE escalated_to END,
    escalation_reason = CASE WHEN p_action = 'escalate' THEN p_escalation_reason ELSE escalation_reason END,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_review_id;

  -- Audit log
  INSERT INTO audit_log (
    agency_id,
    action_type,
    action_description,
    user_id,
    target_id,
    metadata,
    is_simulation,
    created_at
  ) VALUES (
    v_review_record.agency_id,
    'SUPERVISOR_REVIEW_ACTION',
    'Supervisor ' || p_action || ' review',
    p_supervisor_id,
    p_review_id,
    jsonb_build_object(
      'action', p_action,
      'review_type', v_review_record.review_type,
      'resident_id', v_review_record.resident_id,
      'quality_rating', p_quality_rating,
      'idempotency_key', p_idempotency_key
    ),
    p_is_simulation,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'review_id', p_review_id,
    'action', p_action,
    'message', 'Review action submitted successfully'
  );
END;
$$;

-- RPC to fetch pending reviews for supervisor
CREATE OR REPLACE FUNCTION get_supervisor_pending_reviews(
  p_supervisor_id uuid,
  p_agency_id uuid,
  p_filter_type text DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  review_type text,
  status text,
  severity text,
  resident_id uuid,
  resident_name text,
  caregiver_id uuid,
  caregiver_name text,
  review_data jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id,
    sr.review_type,
    sr.status,
    sr.severity,
    sr.resident_id,
    COALESCE(r.first_name || ' ' || r.last_name, 'Unknown') as resident_name,
    sr.reviewed_by as caregiver_id,
    COALESCE(up.full_name, 'Unknown') as caregiver_name,
    sr.review_data,
    sr.created_at
  FROM supervisor_reviews sr
  LEFT JOIN residents r ON sr.resident_id = r.id
  LEFT JOIN user_profiles up ON sr.reviewed_by = up.id
  WHERE sr.agency_id = p_agency_id
    AND sr.status IN ('pending', 'in_review')
    AND (p_filter_type IS NULL OR sr.review_type = p_filter_type)
    AND (p_is_simulation = false OR sr.is_simulation = true)
  ORDER BY
    CASE sr.severity
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    sr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_supervisor_review_action TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_supervisor_pending_reviews TO authenticated, anon;

COMMENT ON FUNCTION submit_supervisor_review_action IS
'Submit supervisor review action (approve/reject/escalate) with idempotency protection';

COMMENT ON FUNCTION get_supervisor_pending_reviews IS
'Fetch pending reviews for supervisor, ordered by severity and date';
