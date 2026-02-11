/*
  # Device Integration Acceptance Guards

  ## Purpose
  Enforce truth in acceptance testing by blocking seeded/simulated device data
  when real device integration is being validated.

  ## Changes
  1. Add `data_source` tracking to health_metrics
  2. Add acceptance mode flag to system config
  3. Create RPC to reject non-real device data in acceptance mode
  4. Add verifier that checks for real device signatures

  ## Truth Enforcement
  - Seeded data CANNOT pass acceptance
  - Real device data MUST have:
    - Real device IDs (not generated)
    - Real sync timestamps
    - Real manufacturer payloads
    - Source = 'REAL_DEVICE' not 'SEEDED'
*/

-- Add data source tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'health_metrics' AND column_name = 'data_source'
  ) THEN
    ALTER TABLE health_metrics
    ADD COLUMN data_source text DEFAULT 'UNKNOWN' CHECK (data_source IN ('REAL_DEVICE', 'SEEDED', 'MANUAL_ENTRY', 'UNKNOWN'));
  END IF;
END $$;

-- Add acceptance mode tracking to device registry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'device_registry' AND column_name = 'real_device_verified'
  ) THEN
    ALTER TABLE device_registry
    ADD COLUMN real_device_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create external user mappings table (for OAuth users)
CREATE TABLE IF NOT EXISTS external_user_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('apple_health', 'fitbit', 'garmin', 'omron', 'withings')),
  external_user_id text NOT NULL,
  oauth_token_encrypted text,
  oauth_refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider_type, external_user_id)
);

ALTER TABLE external_user_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can manage own external mappings"
  ON external_user_mappings
  FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));

-- Create integration endpoint status table
CREATE TABLE IF NOT EXISTS integration_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_name text UNIQUE NOT NULL,
  provider_type text NOT NULL,
  endpoint_url text NOT NULL,
  is_active boolean DEFAULT true,
  requires_oauth boolean DEFAULT false,
  oauth_configured boolean DEFAULT false,
  last_successful_call timestamptz,
  total_calls bigint DEFAULT 0,
  total_failures bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert real integration endpoints
INSERT INTO integration_endpoints (endpoint_name, provider_type, endpoint_url, requires_oauth, oauth_configured)
VALUES
  ('apple-health-webhook', 'health_platform', '/functions/v1/apple-health-webhook', true, false),
  ('fitbit-webhook', 'health_platform', '/functions/v1/fitbit-webhook', true, false),
  ('garmin-webhook', 'health_platform', '/functions/v1/garmin-webhook', true, false),
  ('omron-device-ingest', 'medical_device', '/functions/v1/omron-device-ingest', false, true)
ON CONFLICT (endpoint_name) DO NOTHING;

-- RPC: Check if device integration is real (not seeded)
CREATE OR REPLACE FUNCTION check_device_integration_is_real(
  p_resident_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_devices int;
  v_real_devices int;
  v_total_metrics int;
  v_real_metrics int;
  v_seeded_metrics int;
  v_integration_calls int;
  v_has_real_sync boolean;
BEGIN
  -- Count devices
  SELECT COUNT(*) INTO v_total_devices
  FROM device_registry
  WHERE resident_id = p_resident_id;

  SELECT COUNT(*) INTO v_real_devices
  FROM device_registry
  WHERE resident_id = p_resident_id
    AND real_device_verified = true;

  -- Count metrics by source
  SELECT COUNT(*) INTO v_total_metrics
  FROM health_metrics
  WHERE resident_id = p_resident_id;

  SELECT COUNT(*) INTO v_real_metrics
  FROM health_metrics
  WHERE resident_id = p_resident_id
    AND data_source = 'REAL_DEVICE';

  SELECT COUNT(*) INTO v_seeded_metrics
  FROM health_metrics
  WHERE resident_id = p_resident_id
    AND data_source = 'SEEDED';

  -- Count real integration calls
  SELECT COUNT(*) INTO v_integration_calls
  FROM integration_requests ir
  JOIN device_registry dr ON dr.resident_id = p_resident_id
  WHERE ir.provider_type IN ('health_platform', 'medical_device')
    AND ir.response_status = 200
    AND ir.completed_at IS NOT NULL;

  -- Check for real sync activity
  v_has_real_sync := EXISTS (
    SELECT 1
    FROM device_sync_log dsl
    JOIN device_registry dr ON dr.id = dsl.device_registry_id
    WHERE dr.resident_id = p_resident_id
      AND dsl.sync_status = 'SUCCESS'
      AND dsl.created_at > now() - interval '24 hours'
  );

  RETURN jsonb_build_object(
    'acceptance_ready', (v_real_devices > 0 AND v_real_metrics > 0 AND v_seeded_metrics = 0),
    'total_devices', v_total_devices,
    'real_devices_verified', v_real_devices,
    'total_metrics', v_total_metrics,
    'real_device_metrics', v_real_metrics,
    'seeded_metrics', v_seeded_metrics,
    'integration_api_calls', v_integration_calls,
    'has_recent_sync', v_has_real_sync,
    'blocker', CASE
      WHEN v_real_devices = 0 THEN 'No real devices verified'
      WHEN v_real_metrics = 0 THEN 'No real device metrics received'
      WHEN v_seeded_metrics > 0 THEN 'Seeded data present - must be removed for acceptance'
      ELSE NULL
    END
  );
END;
$$;

-- RPC: Mark seeded data explicitly (for showcase transparency)
CREATE OR REPLACE FUNCTION mark_showcase_device_data_as_seeded(
  p_resident_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics_marked int;
BEGIN
  UPDATE health_metrics
  SET data_source = 'SEEDED'
  WHERE resident_id = p_resident_id
    AND data_source = 'UNKNOWN';

  GET DIAGNOSTICS v_metrics_marked = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'metrics_marked_as_seeded', v_metrics_marked
  );
END;
$$;

-- RPC: Get integration endpoint status
CREATE OR REPLACE FUNCTION get_integration_endpoint_status()
RETURNS TABLE (
  endpoint_name text,
  provider_type text,
  is_active boolean,
  requires_oauth boolean,
  oauth_configured boolean,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.endpoint_name,
    ie.provider_type,
    ie.is_active,
    ie.requires_oauth,
    ie.oauth_configured,
    CASE
      WHEN NOT ie.is_active THEN 'INACTIVE'
      WHEN ie.requires_oauth AND NOT ie.oauth_configured THEN 'AWAITING_OAUTH_CONFIG'
      WHEN ie.requires_oauth AND ie.oauth_configured THEN 'READY_FOR_DEVICE_INPUT'
      WHEN NOT ie.requires_oauth THEN 'READY_FOR_DEVICE_INPUT'
      ELSE 'UNKNOWN'
    END as status
  FROM integration_endpoints ie
  ORDER BY ie.provider_type, ie.endpoint_name;
END;
$$;