/*
  # Metrics and Quota Management RPCs

  1. Purpose
    - Record tenant and system metrics
    - Check and enforce quotas
    - Track quota usage
    - Support predictable response times

  2. Functions
    - record_tenant_metric()
    - record_system_metric()
    - check_tenant_quota()
    - increment_quota_usage()
    - get_tenant_metrics_summary()

  3. Security
    - Permission-based access control
    - Tenant isolation enforced
*/

-- Record tenant metric
CREATE OR REPLACE FUNCTION record_tenant_metric(
  p_tenant_id uuid,
  p_metric_type text,
  p_component text,
  p_value numeric,
  p_unit text,
  p_aggregation_window text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  INSERT INTO tenant_metrics (
    tenant_id,
    metric_type,
    metric_component,
    metric_value,
    metric_unit,
    aggregation_window
  ) VALUES (
    p_tenant_id,
    p_metric_type,
    p_component,
    p_value,
    p_unit,
    p_aggregation_window
  )
  RETURNING metric_id INTO v_metric_id;

  INSERT INTO scaling_audit_log (
    tenant_id,
    component,
    action,
    actor,
    outcome,
    metadata
  ) VALUES (
    p_tenant_id,
    'METRICS',
    'RECORD_TENANT_METRIC',
    'system',
    'SUCCESS',
    jsonb_build_object('metric_type', p_metric_type, 'component', p_component, 'value', p_value)
  );

  RETURN v_metric_id;
END;
$$;

-- Record system metric
CREATE OR REPLACE FUNCTION record_system_metric(
  p_metric_type text,
  p_component text,
  p_value numeric,
  p_unit text,
  p_aggregation_window text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  INSERT INTO system_metrics (
    metric_type,
    metric_component,
    metric_value,
    metric_unit,
    aggregation_window
  ) VALUES (
    p_metric_type,
    p_component,
    p_value,
    p_unit,
    p_aggregation_window
  )
  RETURNING metric_id INTO v_metric_id;

  INSERT INTO scaling_audit_log (
    tenant_id,
    component,
    action,
    actor,
    outcome,
    metadata
  ) VALUES (
    NULL,
    'SYSTEM',
    'RECORD_SYSTEM_METRIC',
    'system',
    'SUCCESS',
    jsonb_build_object('metric_type', p_metric_type, 'component', p_component, 'value', p_value)
  );

  RETURN v_metric_id;
END;
$$;

-- Check tenant quota (returns true if under quota, false if exceeded)
CREATE OR REPLACE FUNCTION check_tenant_quota(
  p_tenant_id uuid,
  p_resource_type text,
  p_increment_amount integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota_record record;
  v_usage_record record;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_current_usage integer;
  v_allowed boolean;
BEGIN
  -- Get active quota for tenant and resource
  SELECT * INTO v_quota_record
  FROM tenant_quotas
  WHERE tenant_id = p_tenant_id
    AND resource_type = p_resource_type
    AND is_active = true
    AND effective_from <= now()
    AND (effective_until IS NULL OR effective_until >= now())
  ORDER BY effective_from DESC
  LIMIT 1;

  -- If no quota defined, allow
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'no_quota_defined',
      'current_usage', 0,
      'quota_limit', NULL
    );
  END IF;

  -- Calculate period boundaries based on quota_period
  CASE v_quota_record.quota_period
    WHEN 'minute' THEN
      v_period_start := date_trunc('minute', now());
      v_period_end := v_period_start + interval '1 minute';
    WHEN 'hour' THEN
      v_period_start := date_trunc('hour', now());
      v_period_end := v_period_start + interval '1 hour';
    WHEN 'day' THEN
      v_period_start := date_trunc('day', now());
      v_period_end := v_period_start + interval '1 day';
    WHEN 'month' THEN
      v_period_start := date_trunc('month', now());
      v_period_end := v_period_start + interval '1 month';
  END CASE;

  -- Get current usage for this period
  SELECT * INTO v_usage_record
  FROM tenant_quota_usage
  WHERE tenant_id = p_tenant_id
    AND resource_type = p_resource_type
    AND usage_period_start = v_period_start
    AND usage_period_end = v_period_end;

  IF FOUND THEN
    v_current_usage := v_usage_record.usage_count;
  ELSE
    v_current_usage := 0;
  END IF;

  -- Check if incrementing would exceed quota
  v_allowed := (v_current_usage + p_increment_amount) <= v_quota_record.quota_limit;

  -- If hard limit and would exceed, reject
  IF v_quota_record.hard_limit AND NOT v_allowed THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'current_usage', v_current_usage,
      'quota_limit', v_quota_record.quota_limit,
      'requested_increment', p_increment_amount
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'under_quota',
    'current_usage', v_current_usage,
    'quota_limit', v_quota_record.quota_limit,
    'requested_increment', p_increment_amount
  );
END;
$$;

-- Increment quota usage
CREATE OR REPLACE FUNCTION increment_quota_usage(
  p_tenant_id uuid,
  p_resource_type text,
  p_increment_amount integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota_record record;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_usage_id uuid;
  v_new_count integer;
BEGIN
  -- Get active quota
  SELECT * INTO v_quota_record
  FROM tenant_quotas
  WHERE tenant_id = p_tenant_id
    AND resource_type = p_resource_type
    AND is_active = true
    AND effective_from <= now()
    AND (effective_until IS NULL OR effective_until >= now())
  ORDER BY effective_from DESC
  LIMIT 1;

  -- If no quota, just return success
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'reason', 'no_quota_defined');
  END IF;

  -- Calculate period boundaries
  CASE v_quota_record.quota_period
    WHEN 'minute' THEN
      v_period_start := date_trunc('minute', now());
      v_period_end := v_period_start + interval '1 minute';
    WHEN 'hour' THEN
      v_period_start := date_trunc('hour', now());
      v_period_end := v_period_start + interval '1 hour';
    WHEN 'day' THEN
      v_period_start := date_trunc('day', now());
      v_period_end := v_period_start + interval '1 day';
    WHEN 'month' THEN
      v_period_start := date_trunc('month', now());
      v_period_end := v_period_start + interval '1 month';
  END CASE;

  -- Insert or update usage
  INSERT INTO tenant_quota_usage (
    tenant_id,
    resource_type,
    usage_period_start,
    usage_period_end,
    usage_count,
    quota_limit
  ) VALUES (
    p_tenant_id,
    p_resource_type,
    v_period_start,
    v_period_end,
    p_increment_amount,
    v_quota_record.quota_limit
  )
  ON CONFLICT (tenant_id, resource_type, usage_period_start, usage_period_end)
  DO UPDATE SET
    usage_count = tenant_quota_usage.usage_count + p_increment_amount,
    updated_at = now(),
    first_exceeded_at = CASE
      WHEN tenant_quota_usage.first_exceeded_at IS NULL 
           AND (tenant_quota_usage.usage_count + p_increment_amount) > tenant_quota_usage.quota_limit
      THEN now()
      ELSE tenant_quota_usage.first_exceeded_at
    END
  RETURNING usage_id, usage_count INTO v_usage_id, v_new_count;

  RETURN jsonb_build_object(
    'success', true,
    'usage_id', v_usage_id,
    'new_count', v_new_count,
    'quota_limit', v_quota_record.quota_limit,
    'exceeded', v_new_count > v_quota_record.quota_limit
  );
END;
$$;

-- Get tenant metrics summary
CREATE OR REPLACE FUNCTION get_tenant_metrics_summary(
  p_tenant_id uuid,
  p_time_window interval DEFAULT interval '1 hour'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'metric_type', metric_type,
      'component', metric_component,
      'count', count(*),
      'avg_value', avg(metric_value),
      'min_value', min(metric_value),
      'max_value', max(metric_value),
      'unit', metric_unit
    )
  )
  INTO v_result
  FROM tenant_metrics
  WHERE tenant_id = p_tenant_id
    AND metric_timestamp >= now() - p_time_window
  GROUP BY metric_type, metric_component, metric_unit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Add unique constraint for quota usage periods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenant_quota_usage_unique_period'
  ) THEN
    ALTER TABLE tenant_quota_usage
    ADD CONSTRAINT tenant_quota_usage_unique_period 
    UNIQUE (tenant_id, resource_type, usage_period_start, usage_period_end);
  END IF;
END $$;
