/*
  # Senior Medication Self-Logging RPC with Idempotency

  ## Purpose
  Allow seniors to log their own medication administration.
  Supports both scheduled doses and PRN (as-needed) medications.
  
  ## Features
  - Idempotency protection (prevent duplicate logs)
  - is_simulation parameter (showcase mode compatibility)
  - Self-logging by senior (auth.uid() as administrator)
  - Handles scheduled and PRN medications
  - Returns detailed status

  ## Usage
  Called from SeniorMedicationsPage when senior marks medication as taken
*/

-- Create idempotency table for medication logging
CREATE TABLE IF NOT EXISTS medication_log_idempotency (
  idempotency_key text PRIMARY KEY,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES resident_medications(id) ON DELETE CASCADE,
  log_id uuid NOT NULL REFERENCES medication_administration_log(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_med_log_idempotency_created 
ON medication_log_idempotency(created_at);

ALTER TABLE medication_log_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own idempotency records"
  ON medication_log_idempotency FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT resident_id FROM senior_resident_links WHERE senior_user_id = auth.uid()
    )
  );

-- Senior self-log medication RPC
CREATE OR REPLACE FUNCTION senior_log_medication_taken(
  p_resident_id uuid,
  p_medication_id uuid,
  p_schedule_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_existing_log_id uuid;
  v_medication_name text;
  v_dosage text;
  v_route text;
  v_scheduled_time timestamptz;
  v_is_late boolean DEFAULT false;
  v_time_diff_minutes integer;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT log_id INTO v_existing_log_id
    FROM medication_log_idempotency
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_log_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'log_id', v_existing_log_id,
        'message', 'Medication already logged (idempotent)',
        'is_duplicate', true
      );
    END IF;
  END IF;

  -- Verify senior has access to this resident
  IF NOT EXISTS (
    SELECT 1 FROM senior_resident_links
    WHERE senior_user_id = auth.uid()
      AND resident_id = p_resident_id
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Senior not authorized for this resident';
  END IF;

  -- Get medication details
  SELECT medication_name, dosage, route
  INTO v_medication_name, v_dosage, v_route
  FROM resident_medications
  WHERE id = p_medication_id
    AND resident_id = p_resident_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_MEDICATION: Medication not found or not active';
  END IF;

  -- Check if scheduled dose
  IF p_schedule_id IS NOT NULL THEN
    SELECT expected_at INTO v_scheduled_time
    FROM medication_schedules
    WHERE id = p_schedule_id
      AND resident_id = p_resident_id
      AND status = 'PENDING';

    IF FOUND THEN
      v_time_diff_minutes := EXTRACT(EPOCH FROM (now() - v_scheduled_time)) / 60;
      IF v_time_diff_minutes > 30 THEN
        v_is_late := true;
      END IF;
    END IF;
  END IF;

  -- Insert medication log
  INSERT INTO medication_administration_log (
    resident_id,
    medication_id,
    scheduled_time,
    administered_at,
    administered_by,
    status,
    dosage_given,
    route_used,
    resident_response,
    is_controlled,
    dual_verification_required,
    dual_verification_completed,
    language_context,
    is_simulation,
    notes
  ) VALUES (
    p_resident_id,
    p_medication_id,
    v_scheduled_time,
    now(),
    auth.uid(),
    CASE WHEN v_is_late THEN 'LATE' ELSE 'TAKEN' END,
    v_dosage,
    v_route,
    p_notes,
    false,
    false,
    false,
    'en',
    p_is_simulation,
    p_notes
  )
  RETURNING id INTO v_log_id;

  -- Update schedule if applicable
  IF p_schedule_id IS NOT NULL THEN
    UPDATE medication_schedules
    SET status = 'COMPLETED',
        completed_at = now(),
        administration_log_id = v_log_id,
        updated_at = now()
    WHERE id = p_schedule_id;
  END IF;

  -- Store idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO medication_log_idempotency (
      idempotency_key,
      resident_id,
      medication_id,
      log_id
    ) VALUES (
      p_idempotency_key,
      p_resident_id,
      p_medication_id,
      v_log_id
    );
  END IF;

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
    (SELECT agency_id FROM residents WHERE id = p_resident_id),
    'MEDICATION_SELF_LOGGED',
    format('Senior self-logged medication: %s', v_medication_name),
    auth.uid(),
    p_resident_id,
    jsonb_build_object(
      'log_id', v_log_id,
      'medication_name', v_medication_name,
      'is_late', v_is_late
    ),
    p_is_simulation,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'medication_name', v_medication_name,
    'is_late', v_is_late,
    'time_diff_minutes', v_time_diff_minutes,
    'is_duplicate', false,
    'message', 'Medication logged successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION senior_log_medication_taken TO authenticated;

COMMENT ON FUNCTION senior_log_medication_taken IS
'Allow seniors to self-log medication administration with idempotency protection.';

-- Get senior medication view (with is_simulation filtering)
CREATE OR REPLACE FUNCTION get_senior_medications(
  p_resident_id uuid,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scheduled jsonb[] DEFAULT ARRAY[]::jsonb[];
  v_prn jsonb[] DEFAULT ARRAY[]::jsonb[];
  v_record record;
BEGIN
  -- Verify senior access
  IF NOT EXISTS (
    SELECT 1 FROM senior_resident_links
    WHERE senior_user_id = auth.uid()
      AND resident_id = p_resident_id
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Not authorized for this resident';
  END IF;

  -- Get scheduled medications for today
  FOR v_record IN
    SELECT 
      ms.id as schedule_id,
      ms.scheduled_time,
      ms.expected_at,
      ms.status,
      ms.completed_at,
      rm.id as medication_id,
      rm.medication_name,
      rm.dosage,
      rm.route,
      rm.special_instructions,
      mal.administered_at as last_taken
    FROM medication_schedules ms
    JOIN resident_medications rm ON rm.id = ms.medication_id
    LEFT JOIN medication_administration_log mal 
      ON mal.id = ms.administration_log_id
      AND mal.is_simulation = p_is_simulation
    WHERE ms.resident_id = p_resident_id
      AND ms.scheduled_date = CURRENT_DATE
      AND rm.is_prn = false
      AND rm.is_active = true
    ORDER BY ms.scheduled_time
  LOOP
    v_scheduled := array_append(v_scheduled, jsonb_build_object(
      'schedule_id', v_record.schedule_id,
      'medication_id', v_record.medication_id,
      'medication_name', v_record.medication_name,
      'dosage', v_record.dosage,
      'route', v_record.route,
      'scheduled_time', v_record.scheduled_time,
      'expected_at', v_record.expected_at,
      'status', v_record.status,
      'completed_at', v_record.completed_at,
      'last_taken', v_record.last_taken,
      'special_instructions', v_record.special_instructions
    ));
  END LOOP;

  -- Get PRN medications
  FOR v_record IN
    SELECT 
      rm.id as medication_id,
      rm.medication_name,
      rm.dosage,
      rm.route,
      rm.indication,
      rm.special_instructions,
      (
        SELECT administered_at 
        FROM medication_administration_log
        WHERE medication_id = rm.id
          AND resident_id = p_resident_id
          AND is_simulation = p_is_simulation
        ORDER BY administered_at DESC
        LIMIT 1
      ) as last_taken
    FROM resident_medications rm
    WHERE rm.resident_id = p_resident_id
      AND rm.is_prn = true
      AND rm.is_active = true
    ORDER BY rm.medication_name
  LOOP
    v_prn := array_append(v_prn, jsonb_build_object(
      'medication_id', v_record.medication_id,
      'medication_name', v_record.medication_name,
      'dosage', v_record.dosage,
      'route', v_record.route,
      'indication', v_record.indication,
      'special_instructions', v_record.special_instructions,
      'last_taken', v_record.last_taken
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'scheduled', to_jsonb(v_scheduled),
    'prn', to_jsonb(v_prn),
    'date', CURRENT_DATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_senior_medications TO authenticated;

COMMENT ON FUNCTION get_senior_medications IS
'Get senior medication list with schedule for today and PRN medications.';
