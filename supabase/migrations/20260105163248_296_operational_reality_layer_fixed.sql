/*
  # Operational Reality Layer

  1. New Tables
    - `resident_access_codes` - QR codes and short codes for resident lookup
    - `active_sessions` - Session management for shared tablet mode
    - `task_overrides` - Log of task ownership overrides
    - `caregiver_proximity` - Track caregiver availability and proximity

  2. RPC Functions
    - `lookup_resident_by_code` - Find resident by QR/short code
    - `create_qr_session` - Create time-limited session for QR-based access
    - `check_task_collision` - Check if task is already being worked on
    - `log_task_override` - Log task ownership override

  3. Security
    - RLS policies for all new tables
    - Audit logging for overrides
*/

CREATE TABLE IF NOT EXISTS resident_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  code_type text NOT NULL CHECK (code_type IN ('qr', 'short_code', 'nfc')),
  code_value text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  last_used_at timestamptz,
  use_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_resident_access_codes_code_value ON resident_access_codes(code_value);
CREATE INDEX IF NOT EXISTS idx_resident_access_codes_resident_id ON resident_access_codes(resident_id);

CREATE TABLE IF NOT EXISTS active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  session_type text NOT NULL CHECK (session_type IN ('full_access', 'qr_limited', 'shared_tablet')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_device ON active_sessions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);

CREATE TABLE IF NOT EXISTS task_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  overridden_by uuid NOT NULL REFERENCES auth.users(id),
  previous_owner_id uuid REFERENCES auth.users(id),
  previous_owner_name text,
  override_reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_task_overrides_task_id ON task_overrides(task_id);
CREATE INDEX IF NOT EXISTS idx_task_overrides_overridden_by ON task_overrides(overridden_by);

CREATE TABLE IF NOT EXISTS caregiver_proximity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  location text,
  proximity_status text CHECK (proximity_status IN ('available', 'busy', 'off_shift', 'break')),
  last_seen_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caregiver_proximity_user_id ON caregiver_proximity(user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_proximity_resident_id ON caregiver_proximity(resident_id);

ALTER TABLE residents ADD COLUMN IF NOT EXISTS qr_code text;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS short_code text;

CREATE OR REPLACE FUNCTION lookup_resident_by_code(
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
  v_access_code resident_access_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_access_code
  FROM resident_access_codes
  WHERE code_value = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF FOUND THEN
    UPDATE resident_access_codes
    SET last_used_at = now(),
        use_count = use_count + 1
    WHERE id = v_access_code.id;

    RETURN jsonb_build_object(
      'success', true,
      'resident_id', v_access_code.resident_id,
      'code_type', v_access_code.code_type
    );
  END IF;

  SELECT id INTO v_resident_id
  FROM residents
  WHERE qr_code = p_code OR short_code = p_code;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'resident_id', v_resident_id,
      'code_type', 'legacy'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Invalid or expired code'
  );
END;
$$;

CREATE OR REPLACE FUNCTION create_qr_session(
  p_code text,
  p_device_id text,
  p_duration_minutes integer DEFAULT 240
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lookup_result jsonb;
  v_resident_id uuid;
  v_session_id uuid;
BEGIN
  v_lookup_result := lookup_resident_by_code(p_code);

  IF NOT (v_lookup_result->>'success')::boolean THEN
    RETURN v_lookup_result;
  END IF;

  v_resident_id := (v_lookup_result->>'resident_id')::uuid;

  INSERT INTO active_sessions (
    user_id,
    resident_id,
    device_id,
    session_type,
    expires_at
  ) VALUES (
    auth.uid(),
    v_resident_id,
    p_device_id,
    'qr_limited',
    now() + (p_duration_minutes || ' minutes')::interval
  )
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'resident_id', v_resident_id,
    'expires_at', now() + (p_duration_minutes || ' minutes')::interval
  );
END;
$$;

CREATE OR REPLACE FUNCTION check_task_collision(
  p_task_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_owner_name text;
  v_current_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  IF v_task.state = 'in_progress' AND v_task.owner_user_id != v_current_user_id THEN
    SELECT full_name INTO v_owner_name
    FROM user_profiles
    WHERE id = v_task.owner_user_id;

    RETURN jsonb_build_object(
      'collision_detected', true,
      'current_owner_id', v_task.owner_user_id,
      'current_owner_name', COALESCE(v_owner_name, 'Another caregiver'),
      'task_state', v_task.state,
      'started_at', v_task.actual_start
    );
  END IF;

  RETURN jsonb_build_object(
    'collision_detected', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION log_task_override(
  p_task_id uuid,
  p_override_reason text,
  p_previous_owner_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_override_id uuid;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  INSERT INTO task_overrides (
    task_id,
    overridden_by,
    previous_owner_id,
    previous_owner_name,
    override_reason
  ) VALUES (
    p_task_id,
    auth.uid(),
    v_task.owner_user_id,
    p_previous_owner_name,
    p_override_reason
  )
  RETURNING id INTO v_override_id;

  UPDATE tasks
  SET owner_user_id = auth.uid()
  WHERE id = p_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'override_id', v_override_id,
    'new_owner_id', auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION generate_resident_access_code(
  p_resident_id uuid,
  p_code_type text DEFAULT 'short_code'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_prefix text;
  v_random_suffix text;
  v_code_id uuid;
BEGIN
  IF p_code_type = 'short_code' THEN
    v_prefix := 'RES';
    v_random_suffix := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    v_code := v_prefix || v_random_suffix;
  ELSIF p_code_type = 'qr' THEN
    v_code := 'QR-' || substr(md5(random()::text), 1, 12);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid code type');
  END IF;

  INSERT INTO resident_access_codes (
    resident_id,
    code_type,
    code_value,
    created_by
  ) VALUES (
    p_resident_id,
    p_code_type,
    v_code,
    auth.uid()
  )
  RETURNING id INTO v_code_id;

  RETURN jsonb_build_object(
    'success', true,
    'code_id', v_code_id,
    'code_value', v_code,
    'code_type', p_code_type
  );
END;
$$;

ALTER TABLE resident_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can view access codes for their residents"
  ON resident_access_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_assignments ca
      WHERE ca.resident_id = resident_access_codes.resident_id
        AND ca.caregiver_user_id = auth.uid()
        AND ca.status = 'active'
    )
  );

CREATE POLICY "Agency admins can manage access codes"
  ON resident_access_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('agency_admin', 'super_admin')
    )
  );

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON active_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own sessions"
  ON active_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON active_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE task_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task overrides for their tasks"
  ON task_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_overrides.task_id
        AND (t.owner_user_id = auth.uid() OR t.resident_id IN (
          SELECT resident_id FROM caregiver_assignments
          WHERE caregiver_user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Users can insert task overrides"
  ON task_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (overridden_by = auth.uid());

ALTER TABLE caregiver_proximity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can manage own proximity"
  ON caregiver_proximity
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Supervisors can view all caregiver proximity"
  ON caregiver_proximity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('supervisor', 'agency_admin', 'super_admin')
    )
  );
