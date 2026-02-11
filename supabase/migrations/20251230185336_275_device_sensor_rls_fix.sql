/*
  # Fix Device Sensor RLS Policies

  Fix RLS policies for device_connections to use correct column references.
*/

DROP POLICY IF EXISTS "Agency users can view device connections" ON device_connections;

CREATE POLICY "Agency users can view device connections"
  ON device_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN device_registry dr ON dr.id = device_connections.device_id
      JOIN residents res ON res.id = dr.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
    )
  );
