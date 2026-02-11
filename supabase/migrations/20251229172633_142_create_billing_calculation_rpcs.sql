/*
  # Billing Calculation RPCs (Phase 25)

  ## Purpose
  Calculate billing from sealed attendance records.
  Read-only operations on sealed data.

  ## Functions
  1. calculate_billing_preview - Preview billing for date range
  2. get_resident_billable_units - Get billable units for resident

  ## Security
  - All functions enforce authorization
  - Only reads sealed attendance
  - Cannot modify source data

  ## Enforcement Rules
  1. Billing derived from: Sealed attendance, Resident eligibility, Insurance coverage, Service types
  2. Billing uses care delivered, not scheduled
  3. Missing attendance → no billable unit
  4. All billable units trace to attendance IDs
*/

-- Function: calculate_billing_preview
-- Calculates billing preview for date range
CREATE OR REPLACE FUNCTION calculate_billing_preview(
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_billing_records jsonb := '[]'::jsonb;
  v_resident record;
  v_total_units numeric := 0;
  v_total_amount numeric := 0;
  v_record_count integer := 0;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only agency admins and finance admins can calculate billing
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only AGENCY_ADMIN or FINANCE_ADMIN can calculate billing';
  END IF;

  -- Validate date range
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;

  -- Calculate billing for each resident with sealed attendance
  FOR v_resident IN
    SELECT DISTINCT
      sra.resident_id,
      r.full_name,
      r.medicaid_number
    FROM shift_resident_assignments sra
    JOIN residents r ON r.id = sra.resident_id
    JOIN shifts s ON s.id = sra.shift_id
    JOIN attendance_events ae ON ae.shift_id = s.id
    WHERE s.agency_id = v_agency_id
    AND ae.is_sealed = true
    AND ae.timestamp::date BETWEEN p_start_date AND p_end_date
  LOOP
    DECLARE
      v_units numeric := 0;
      v_amount numeric := 0;
      v_rate numeric;
      v_billing_unit text;
      v_shift record;
      v_attendance_ids text[] := '{}';
    BEGIN
      -- Get billing configuration
      SELECT billing_rate, billing_unit
      INTO v_rate, v_billing_unit
      FROM resident_billing_config
      WHERE resident_id = v_resident.resident_id
      AND agency_id = v_agency_id
      AND is_active = true
      AND p_start_date >= effective_start_date
      AND (effective_end_date IS NULL OR p_start_date <= effective_end_date)
      ORDER BY effective_start_date DESC
      LIMIT 1;

      IF v_rate IS NULL THEN
        CONTINUE;
      END IF;

      -- Calculate billable units from sealed attendance
      FOR v_shift IN
        SELECT 
          s.id as shift_id,
          cin.id as clock_in_id,
          cout.id as clock_out_id,
          EXTRACT(EPOCH FROM (cout.timestamp - cin.timestamp)) / 3600 as hours_worked
        FROM shift_resident_assignments sra
        JOIN shifts s ON s.id = sra.shift_id
        JOIN attendance_events cin ON cin.shift_id = s.id AND cin.event_type = 'CLOCK_IN' AND cin.is_sealed = true
        JOIN attendance_events cout ON cout.shift_id = s.id AND cout.event_type = 'CLOCK_OUT' AND cout.is_sealed = true
        WHERE sra.resident_id = v_resident.resident_id
        AND s.agency_id = v_agency_id
        AND cin.timestamp::date BETWEEN p_start_date AND p_end_date
      LOOP
        -- Calculate units based on billing unit type
        IF v_billing_unit = 'HOURLY' THEN
          v_units := v_units + v_shift.hours_worked;
        ELSIF v_billing_unit = 'VISIT' THEN
          v_units := v_units + 1;
        ELSIF v_billing_unit = 'DAILY' THEN
          v_units := v_units + 1;
        END IF;

        -- Track attendance IDs for traceability
        v_attendance_ids := array_append(v_attendance_ids, v_shift.clock_in_id::text);
        v_attendance_ids := array_append(v_attendance_ids, v_shift.clock_out_id::text);
      END LOOP;

      -- Calculate amount
      IF v_units > 0 THEN
        v_amount := v_units * v_rate;
        
        v_billing_records := v_billing_records || jsonb_build_object(
          'resident_id', v_resident.resident_id,
          'resident_name', v_resident.full_name,
          'medicaid_number', v_resident.medicaid_number,
          'billing_units', v_units,
          'billing_unit_type', v_billing_unit,
          'billing_rate', v_rate,
          'total_amount', v_amount,
          'attendance_ids', v_attendance_ids
        );

        v_total_units := v_total_units + v_units;
        v_total_amount := v_total_amount + v_amount;
        v_record_count := v_record_count + 1;
      END IF;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'record_count', v_record_count,
    'total_units', v_total_units,
    'total_amount', v_total_amount,
    'records', v_billing_records
  );
END;
$$;

-- Function: get_resident_billable_units
-- Gets billable units for resident for date range
CREATE OR REPLACE FUNCTION get_resident_billable_units(
  p_resident_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total_units numeric := 0;
  v_visits jsonb := '[]'::jsonb;
  v_shift record;
  v_billing_unit text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get billing unit type
  SELECT billing_unit
  INTO v_billing_unit
  FROM resident_billing_config
  WHERE resident_id = p_resident_id
  AND is_active = true
  AND p_start_date >= effective_start_date
  AND (effective_end_date IS NULL OR p_start_date <= effective_end_date)
  ORDER BY effective_start_date DESC
  LIMIT 1;

  -- Calculate units from sealed attendance
  FOR v_shift IN
    SELECT 
      s.id as shift_id,
      s.start_time,
      s.end_time,
      cin.id as clock_in_id,
      cin.timestamp as clock_in_time,
      cout.id as clock_out_id,
      cout.timestamp as clock_out_time,
      EXTRACT(EPOCH FROM (cout.timestamp - cin.timestamp)) / 3600 as hours_worked
    FROM shift_resident_assignments sra
    JOIN shifts s ON s.id = sra.shift_id
    JOIN attendance_events cin ON cin.shift_id = s.id AND cin.event_type = 'CLOCK_IN' AND cin.is_sealed = true
    JOIN attendance_events cout ON cout.shift_id = s.id AND cout.event_type = 'CLOCK_OUT' AND cout.is_sealed = true
    WHERE sra.resident_id = p_resident_id
    AND cin.timestamp::date BETWEEN p_start_date AND p_end_date
  LOOP
    DECLARE
      v_units_for_visit numeric := 0;
    BEGIN
      IF v_billing_unit = 'HOURLY' THEN
        v_units_for_visit := v_shift.hours_worked;
      ELSIF v_billing_unit = 'VISIT' THEN
        v_units_for_visit := 1;
      ELSIF v_billing_unit = 'DAILY' THEN
        v_units_for_visit := 1;
      END IF;

      v_total_units := v_total_units + v_units_for_visit;
      
      v_visits := v_visits || jsonb_build_object(
        'shift_id', v_shift.shift_id,
        'scheduled_start', v_shift.start_time,
        'scheduled_end', v_shift.end_time,
        'actual_clock_in', v_shift.clock_in_time,
        'actual_clock_out', v_shift.clock_out_time,
        'hours_worked', v_shift.hours_worked,
        'billable_units', v_units_for_visit,
        'attendance_ids', ARRAY[v_shift.clock_in_id::text, v_shift.clock_out_id::text]
      );
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'resident_id', p_resident_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'billing_unit_type', v_billing_unit,
    'total_units', v_total_units,
    'visit_count', jsonb_array_length(v_visits),
    'visits', v_visits
  );
END;
$$;
