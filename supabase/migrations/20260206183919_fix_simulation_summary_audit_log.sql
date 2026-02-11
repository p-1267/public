/*
  # Fix Simulation Summary RPC - Audit Log has no agency_id

  ## Purpose
  Fix get_simulation_data_summary to handle tables without agency_id column.
*/

DROP FUNCTION IF EXISTS get_simulation_data_summary(uuid);

CREATE OR REPLACE FUNCTION get_simulation_data_summary(
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := jsonb_build_object(
    'tasks', (SELECT COUNT(*) FROM tasks WHERE agency_id = p_agency_id AND is_simulation = true),
    'vital_signs', (SELECT COUNT(*) FROM vital_signs v JOIN residents r ON r.id = v.resident_id WHERE r.agency_id = p_agency_id AND v.is_simulation = true),
    'intelligence_signals', (SELECT COUNT(*) FROM intelligence_signals i JOIN residents r ON r.id = i.resident_id WHERE r.agency_id = p_agency_id AND i.is_simulation = true),
    'notification_log', (SELECT COUNT(*) FROM notification_log n WHERE n.resident_id IN (SELECT id FROM residents WHERE agency_id = p_agency_id) AND n.is_simulation = true),
    'audit_log', (SELECT COUNT(*) FROM audit_log WHERE is_simulation = true)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_simulation_data_summary(uuid) TO authenticated, anon;

COMMENT ON FUNCTION get_simulation_data_summary IS
'Test helper: Returns count of simulation data by type. Used by parity test suite.';
