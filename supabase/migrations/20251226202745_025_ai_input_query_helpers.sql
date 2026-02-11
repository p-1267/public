/*
  # AI Input Query Helper Functions

  1. Purpose
    - Provide functions to query AI inputs by status
    - Get pending (unacknowledged) inputs
    - Get inputs by type for analysis
    - Support pagination for large result sets

  2. New Functions
    - `get_pending_ai_inputs(limit, offset)` - Get unacknowledged inputs
    - `get_ai_inputs_by_type(type, limit, offset)` - Filter by input type
    - `get_ai_input_stats()` - Get summary statistics

  3. Security
    - Requires VIEW_AI_INPUTS permission
    - Returns only what user is authorized to see
*/

-- Function to get pending (unacknowledged) AI inputs
CREATE OR REPLACE FUNCTION get_pending_ai_inputs(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  input_type text,
  payload jsonb,
  source text,
  context jsonb,
  created_at timestamptz,
  age_seconds numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
BEGIN
  v_user_id := auth.uid();
  
  SELECT user_has_permission(v_user_id, 'VIEW_AI_INPUTS') INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: VIEW_AI_INPUTS required';
  END IF;
  
  RETURN QUERY
  SELECT 
    ai.id,
    ai.input_type,
    ai.payload,
    ai.source,
    ai.context,
    ai.created_at,
    EXTRACT(EPOCH FROM (now() - ai.created_at)) as age_seconds
  FROM ai_learning_inputs ai
  WHERE ai.acknowledged_at IS NULL
  ORDER BY ai.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get AI inputs by type
CREATE OR REPLACE FUNCTION get_ai_inputs_by_type(
  p_input_type text,
  p_include_acknowledged boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  input_type text,
  payload jsonb,
  source text,
  context jsonb,
  created_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
BEGIN
  v_user_id := auth.uid();
  
  SELECT user_has_permission(v_user_id, 'VIEW_AI_INPUTS') INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: VIEW_AI_INPUTS required';
  END IF;
  
  RETURN QUERY
  SELECT 
    ai.id,
    ai.input_type,
    ai.payload,
    ai.source,
    ai.context,
    ai.created_at,
    ai.acknowledged_at,
    ai.acknowledged_by
  FROM ai_learning_inputs ai
  WHERE ai.input_type = p_input_type
    AND (p_include_acknowledged OR ai.acknowledged_at IS NULL)
  ORDER BY ai.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get AI input statistics
CREATE OR REPLACE FUNCTION get_ai_input_stats()
RETURNS TABLE (
  input_type text,
  total_count bigint,
  pending_count bigint,
  acknowledged_count bigint,
  oldest_pending_age_hours numeric,
  avg_acknowledgment_time_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
BEGIN
  v_user_id := auth.uid();
  
  SELECT user_has_permission(v_user_id, 'VIEW_AI_INPUTS') INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: VIEW_AI_INPUTS required';
  END IF;
  
  RETURN QUERY
  SELECT 
    ai.input_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE ai.acknowledged_at IS NULL) as pending_count,
    COUNT(*) FILTER (WHERE ai.acknowledged_at IS NOT NULL) as acknowledged_count,
    EXTRACT(EPOCH FROM (now() - MIN(ai.created_at) FILTER (WHERE ai.acknowledged_at IS NULL))) / 3600 as oldest_pending_age_hours,
    AVG(EXTRACT(EPOCH FROM (ai.acknowledged_at - ai.created_at)) / 3600) FILTER (WHERE ai.acknowledged_at IS NOT NULL) as avg_acknowledgment_time_hours
  FROM ai_learning_inputs ai
  GROUP BY ai.input_type
  ORDER BY pending_count DESC;
END;
$$;

COMMENT ON FUNCTION get_pending_ai_inputs IS 
'Get AI observations awaiting human review. Returns newest first with age in seconds.';

COMMENT ON FUNCTION get_ai_inputs_by_type IS 
'Get AI observations filtered by input type. Optionally include already-acknowledged inputs.';

COMMENT ON FUNCTION get_ai_input_stats IS 
'Get summary statistics of AI inputs by type including pending counts and average acknowledgment times.';