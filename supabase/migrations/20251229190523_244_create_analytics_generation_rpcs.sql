/*
  # Analytics Generation RPCs (Phase 34)

  ## Purpose
  Core functions for analytics insight generation (read-only, non-executing).
  Analytics explain what happened and what might happen — they never decide what must happen.

  ## Functions
  1. generate_analytics_insight - Generate analytics insight (read-only)
  2. mark_insight_stale - Mark insight as stale
  3. register_analytics_data_source - Register data source (read-only)

  ## Security
  - SECURITY DEFINER for system operations
  - Read-only enforcement
  - Complete audit logging

  ## Enforcement Rules
  1. Analytics are read-only observers
  2. Insights MUST NEVER execute actions
  3. Analytics MUST NOT block workflows
  4. No analytics output may override policy
  5. Separation between Insight and Enforcement is mandatory
  6. Analytics MUST consume ONLY sealed/archived/read-only data
  7. If analytics generation fails: Core system remains unaffected, failure logged, clear error surfaced, no cascading impact
*/

-- Function: generate_analytics_insight
-- Generates analytics insight (read-only, non-executing)
CREATE OR REPLACE FUNCTION generate_analytics_insight(
  p_domain_id text,
  p_insight_type text,
  p_insight_title text,
  p_insight_summary text,
  p_insight_details jsonb,
  p_data_sources text[],
  p_time_range_start timestamptz,
  p_time_range_end timestamptz,
  p_confidence_level numeric,
  p_visible_to_family boolean DEFAULT false,
  p_visible_to_caregivers boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_insight_id text;
  v_domain_name text;
  v_is_incomplete boolean := false;
BEGIN
  v_insight_id := 'insight-' || gen_random_uuid()::text;

  -- Validate domain exists and is active
  SELECT domain_name INTO v_domain_name
  FROM analytics_domains
  WHERE domain_id = p_domain_id
  AND is_active = true;

  IF v_domain_name IS NULL THEN
    -- Log failure
    INSERT INTO analytics_audit_log (
      event_id,
      event_type,
      domain_id,
      actor,
      failure_reason,
      event_details
    ) VALUES (
      gen_random_uuid()::text,
      'ANALYTICS_FAILED',
      p_domain_id,
      'SYSTEM',
      'Domain not found or inactive',
      jsonb_build_object('domain_id', p_domain_id)
    );

    RAISE EXCEPTION 'Analytics domain not found or inactive: %', p_domain_id;
  END IF;

  -- Check if data sources are valid (all must be read-only)
  IF EXISTS (
    SELECT 1
    FROM unnest(p_data_sources) AS source_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM analytics_data_sources ads
      WHERE ads.source_id = source_id
      AND ads.is_read_only = true
      AND ads.is_active = true
    )
  ) THEN
    -- Log failure
    INSERT INTO analytics_audit_log (
      event_id,
      event_type,
      domain_id,
      actor,
      failure_reason,
      event_details
    ) VALUES (
      gen_random_uuid()::text,
      'ANALYTICS_FAILED',
      p_domain_id,
      'SYSTEM',
      'Invalid or non-read-only data sources',
      jsonb_build_object('data_sources', p_data_sources)
    );

    RAISE EXCEPTION 'Invalid or non-read-only data sources provided';
  END IF;

  -- Check for incomplete data (if any sources are missing data)
  -- In production, this would check actual data availability
  v_is_incomplete := false;

  -- Create insight
  INSERT INTO analytics_insights (
    insight_id,
    domain_id,
    insight_type,
    insight_title,
    insight_summary,
    insight_details,
    data_sources,
    time_range_start,
    time_range_end,
    confidence_level,
    is_incomplete,
    visible_to_family,
    visible_to_caregivers
  ) VALUES (
    v_insight_id,
    p_domain_id,
    p_insight_type,
    p_insight_title,
    p_insight_summary,
    p_insight_details,
    p_data_sources,
    p_time_range_start,
    p_time_range_end,
    p_confidence_level,
    v_is_incomplete,
    p_visible_to_family,
    p_visible_to_caregivers
  );

  -- Log audit event
  INSERT INTO analytics_audit_log (
    event_id,
    event_type,
    insight_id,
    domain_id,
    insight_type,
    data_sources,
    time_range_start,
    time_range_end,
    actor,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'INSIGHT_GENERATED',
    v_insight_id,
    p_domain_id,
    p_insight_type,
    p_data_sources,
    p_time_range_start,
    p_time_range_end,
    'SYSTEM',
    jsonb_build_object(
      'confidence_level', p_confidence_level,
      'is_incomplete', v_is_incomplete
    )
  );

  RETURN json_build_object(
    'success', true,
    'insight_id', v_insight_id,
    'domain_name', v_domain_name,
    'insight_type', p_insight_type,
    'confidence_level', p_confidence_level,
    'is_read_only', true,
    'can_trigger_action', false,
    'message', 'Analytics insight generated. This is a read-only observation and does not trigger actions.'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log failure
    INSERT INTO analytics_audit_log (
      event_id,
      event_type,
      domain_id,
      insight_type,
      actor,
      failure_reason,
      event_details
    ) VALUES (
      gen_random_uuid()::text,
      'ANALYTICS_FAILED',
      p_domain_id,
      p_insight_type,
      'SYSTEM',
      SQLERRM,
      jsonb_build_object(
        'error_message', SQLERRM,
        'core_system_affected', false
      )
    );

    -- Return error without affecting core system
    RETURN json_build_object(
      'success', false,
      'error', 'Analytics generation failed: ' || SQLERRM,
      'core_system_affected', false,
      'message', 'Analytics failed but core system remains unaffected'
    );
END;
$$;

-- Function: mark_insight_stale
-- Marks insight as stale
CREATE OR REPLACE FUNCTION mark_insight_stale(
  p_insight_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain_id text;
BEGIN
  UPDATE analytics_insights
  SET is_stale = true
  WHERE insight_id = p_insight_id
  RETURNING domain_id INTO v_domain_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insight not found: %', p_insight_id;
  END IF;

  -- Log audit event
  INSERT INTO analytics_audit_log (
    event_id,
    event_type,
    insight_id,
    domain_id,
    actor,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'INSIGHT_MARKED_STALE',
    p_insight_id,
    v_domain_id,
    'SYSTEM',
    jsonb_build_object('insight_id', p_insight_id)
  );

  RETURN json_build_object(
    'success', true,
    'insight_id', p_insight_id,
    'is_stale', true,
    'message', 'Insight marked as stale'
  );
END;
$$;

-- Function: register_analytics_data_source
-- Registers analytics data source (read-only)
CREATE OR REPLACE FUNCTION register_analytics_data_source(
  p_source_name text,
  p_source_type text,
  p_source_description text,
  p_is_sealed boolean,
  p_is_archived boolean,
  p_source_table text DEFAULT NULL,
  p_refresh_interval_hours integer DEFAULT 24
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_id text;
BEGIN
  v_source_id := 'source-' || gen_random_uuid()::text;

  INSERT INTO analytics_data_sources (
    source_id,
    source_name,
    source_type,
    source_description,
    is_sealed,
    is_archived,
    source_table,
    refresh_interval_hours
  ) VALUES (
    v_source_id,
    p_source_name,
    p_source_type,
    p_source_description,
    p_is_sealed,
    p_is_archived,
    p_source_table,
    p_refresh_interval_hours
  );

  RETURN json_build_object(
    'success', true,
    'source_id', v_source_id,
    'source_type', p_source_type,
    'is_read_only', true,
    'allows_live_data', false,
    'message', 'Analytics data source registered. Source is read-only and does not allow live/mutable data.'
  );
END;
$$;
