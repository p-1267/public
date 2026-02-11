/*
  # Showcase Mode Enforcement (All Phases)

  1. Purpose
    - Block all mutations in showcase mode
    - Allow read-only operations
    - Display clear blocking messages

  2. Implementation
    - Check showcase mode flag before mutations
    - Return blocked status with message
    - Enforce at RPC and trigger level

  3. Functions
    - `is_showcase_mode` - Check if system is in showcase mode
    - `block_if_showcase_mode` - Raise exception if in showcase mode
*/

CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system config"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can update system config"
  ON system_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name = 'SUPER_ADMIN'
    )
  );

INSERT INTO system_config (key, value, description) VALUES
  ('showcase_mode', '{"enabled": false, "message": "SHOWCASE MODE — NON-OPERATIONAL"}'::jsonb, 'Controls showcase mode enforcement')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION is_showcase_mode()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT (value->>'enabled')::boolean INTO v_enabled
  FROM system_config
  WHERE key = 'showcase_mode';
  
  RETURN COALESCE(v_enabled, false);
END;
$$;

CREATE OR REPLACE FUNCTION block_if_showcase_mode()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_showcase_mode boolean;
  v_message text;
BEGIN
  SELECT (value->>'enabled')::boolean, value->>'message'
  INTO v_showcase_mode, v_message
  FROM system_config
  WHERE key = 'showcase_mode';
  
  IF COALESCE(v_showcase_mode, false) THEN
    RAISE EXCEPTION 'SHOWCASE_MODE_BLOCK: %', COALESCE(v_message, 'System is in showcase mode - all mutations blocked');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_showcase_mode_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_showcase_mode boolean;
BEGIN
  SELECT (value->>'enabled')::boolean INTO v_showcase_mode
  FROM system_config
  WHERE key = 'showcase_mode';
  
  IF COALESCE(v_showcase_mode, false) AND TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'SHOWCASE_MODE_BLOCK: All mutations blocked in showcase mode';
  END IF;
  
  RETURN NEW;
END;
$$;
