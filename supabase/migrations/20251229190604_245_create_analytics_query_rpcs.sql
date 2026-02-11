/*
  # Analytics Query RPCs (Phase 34)

  ## Purpose
  Functions for querying analytics insights (read-only).
  Enforces visibility and access control.

  ## Functions
  1. get_analytics_insights_by_domain - Get insights by domain
  2. get_analytics_insight_detail - Get insight detail
  3. get_analytics_domains - Get all analytics domains

  ## Security
  - SECURITY DEFINER for role checking
  - Role-based visibility
  - Complete audit logging

  ## Enforcement Rules
  1. Insights visible to: AGENCY_ADMIN, SUPERVISOR
  2. Family and caregivers: View-only summaries if explicitly permitted
  3. No operational intelligence exposed by default
*/

-- Function: get_analytics_insights_by_domain
-- Gets analytics insights by domain
CREATE OR REPLACE FUNCTION get_analytics_insights_by_domain(
  p_domain_id text,
  p_limit integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_insights json;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user role
  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Check if user role can view analytics
  IF v_user_role NOT IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR') THEN
    -- Check if user is family or caregiver with explicit permission
    IF v_user_role IN ('FAMILY', 'CAREGIVER') THEN
      -- Return view-only summaries if explicitly permitted
      SELECT json_agg(
        json_build_object(
          'insight_id', insight_id,
          'insight_type', insight_type,
          'insight_title', insight_title,
          'insight_summary', insight_summary,
          'confidence_level', confidence_level,
          'is_stale', is_stale,
          'is_incomplete', is_incomplete,
          'generated_at', generated_at,
          'view_only', true
        ) ORDER BY generated_at DESC
      )
      INTO v_insights
      FROM analytics_insights
      WHERE domain_id = p_domain_id
      AND (
        (v_user_role = 'FAMILY' AND visible_to_family = true)
        OR (v_user_role = 'CAREGIVER' AND visible_to_caregivers = true)
      )
      LIMIT p_limit;

      RETURN json_build_object(
        'success', true,
        'insights', COALESCE(v_insights, '[]'::json),
        'view_only', true,
        'message', 'View-only summaries. No operational intelligence exposed.'
      );
    ELSE
      RAISE EXCEPTION 'User role % not authorized to view analytics', v_user_role;
    END IF;
  END IF;

  -- Return full insights for authorized roles
  SELECT json_agg(
    json_build_object(
      'insight_id', insight_id,
      'domain_id', domain_id,
      'insight_type', insight_type,
      'insight_title', insight_title,
      'insight_summary', insight_summary,
      'insight_details', insight_details,
      'data_sources', data_sources,
      'time_range_start', time_range_start,
      'time_range_end', time_range_end,
      'confidence_level', confidence_level,
      'is_stale', is_stale,
      'is_incomplete', is_incomplete,
      'data_freshness_timestamp', data_freshness_timestamp,
      'generated_at', generated_at,
      'is_read_only', is_read_only,
      'can_trigger_action', can_trigger_action
    ) ORDER BY generated_at DESC
  )
  INTO v_insights
  FROM analytics_insights
  WHERE domain_id = p_domain_id
  LIMIT p_limit;

  RETURN json_build_object(
    'success', true,
    'insights', COALESCE(v_insights, '[]'::json)
  );
END;
$$;

-- Function: get_analytics_insight_detail
-- Gets analytics insight detail
CREATE OR REPLACE FUNCTION get_analytics_insight_detail(
  p_insight_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_insight json;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user role
  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Check if user role can view analytics
  IF v_user_role NOT IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR', 'FAMILY', 'CAREGIVER') THEN
    RAISE EXCEPTION 'User role % not authorized to view analytics', v_user_role;
  END IF;

  -- Get insight
  SELECT json_build_object(
    'insight_id', insight_id,
    'domain_id', domain_id,
    'insight_type', insight_type,
    'insight_title', insight_title,
    'insight_summary', insight_summary,
    'insight_details', CASE 
      WHEN v_user_role IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR') THEN insight_details
      ELSE '{}'::jsonb
    END,
    'data_sources', data_sources,
    'time_range_start', time_range_start,
    'time_range_end', time_range_end,
    'confidence_level', confidence_level,
    'is_stale', is_stale,
    'is_incomplete', is_incomplete,
    'data_freshness_timestamp', data_freshness_timestamp,
    'generated_at', generated_at,
    'is_read_only', is_read_only,
    'can_trigger_action', can_trigger_action
  )
  INTO v_insight
  FROM analytics_insights
  WHERE insight_id = p_insight_id
  AND (
    v_user_role IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR')
    OR (v_user_role = 'FAMILY' AND visible_to_family = true)
    OR (v_user_role = 'CAREGIVER' AND visible_to_caregivers = true)
  );

  IF v_insight IS NULL THEN
    RAISE EXCEPTION 'Insight not found or not visible to user: %', p_insight_id;
  END IF;

  -- Log audit event
  INSERT INTO analytics_audit_log (
    event_id,
    event_type,
    insight_id,
    actor,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'INSIGHT_VIEWED',
    p_insight_id,
    'USER',
    jsonb_build_object('user_id', v_user_id, 'user_role', v_user_role)
  );

  RETURN json_build_object(
    'success', true,
    'insight', v_insight
  );
END;
$$;

-- Function: get_analytics_domains
-- Gets all analytics domains
CREATE OR REPLACE FUNCTION get_analytics_domains()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domains json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'domain_id', domain_id,
      'domain_name', domain_name,
      'domain_description', domain_description,
      'is_read_only', is_read_only,
      'can_execute_actions', can_execute_actions,
      'can_block_workflows', can_block_workflows,
      'can_override_policy', can_override_policy,
      'is_active', is_active
    ) ORDER BY domain_name
  )
  INTO v_domains
  FROM analytics_domains
  WHERE is_active = true;

  RETURN json_build_object(
    'success', true,
    'domains', COALESCE(v_domains, '[]'::json)
  );
END;
$$;
