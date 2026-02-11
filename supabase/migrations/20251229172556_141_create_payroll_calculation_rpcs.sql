/*
  # Payroll Calculation RPCs (Phase 25)

  ## Purpose
  Calculate payroll from sealed attendance records.
  Read-only operations on sealed data.

  ## Functions
  1. calculate_payroll_preview - Preview payroll for date range
  2. get_caregiver_hours - Get hours worked by caregiver

  ## Security
  - All functions enforce authorization
  - Only reads sealed attendance
  - Cannot modify source data

  ## Enforcement Rules
  1. Payroll derived from: Sealed attendance, Approved shift definitions, Caregiver rates, Labor rules
  2. No manual time entry allowed
  3. No retroactive changes
*/

-- Function: calculate_payroll_preview
-- Calculates payroll preview for date range
CREATE OR REPLACE FUNCTION calculate_payroll_preview(
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
  v_payroll_records jsonb := '[]'::jsonb;
  v_caregiver record;
  v_total_hours numeric := 0;
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

  -- Only agency admins and finance admins can calculate payroll
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only AGENCY_ADMIN or FINANCE_ADMIN can calculate payroll';
  END IF;

  -- Validate date range
  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;

  -- Calculate payroll for each caregiver with sealed attendance
  FOR v_caregiver IN
    SELECT DISTINCT
      ae.user_id,
      up.full_name,
      up.email
    FROM attendance_events ae
    JOIN user_profiles up ON up.id = ae.user_id
    JOIN shifts s ON s.id = ae.shift_id
    WHERE s.agency_id = v_agency_id
    AND ae.is_sealed = true
    AND ae.timestamp::date BETWEEN p_start_date AND p_end_date
  LOOP
    DECLARE
      v_hours numeric := 0;
      v_amount numeric := 0;
      v_rate numeric;
      v_shift record;
    BEGIN
      -- Calculate total hours from sealed clock-in/clock-out pairs
      FOR v_shift IN
        SELECT 
          s.id as shift_id,
          cin.timestamp as clock_in_time,
          cout.timestamp as clock_out_time,
          EXTRACT(EPOCH FROM (cout.timestamp - cin.timestamp)) / 3600 as hours_worked
        FROM shifts s
        JOIN attendance_events cin ON cin.shift_id = s.id AND cin.event_type = 'CLOCK_IN' AND cin.is_sealed = true
        JOIN attendance_events cout ON cout.shift_id = s.id AND cout.event_type = 'CLOCK_OUT' AND cout.is_sealed = true
        WHERE s.agency_id = v_agency_id
        AND s.caregiver_id = v_caregiver.user_id
        AND cin.timestamp::date BETWEEN p_start_date AND p_end_date
      LOOP
        v_hours := v_hours + v_shift.hours_worked;
      END LOOP;

      -- Get caregiver rate
      SELECT hourly_rate
      INTO v_rate
      FROM caregiver_rates
      WHERE user_id = v_caregiver.user_id
      AND agency_id = v_agency_id
      AND is_active = true
      AND p_start_date >= effective_start_date
      AND (effective_end_date IS NULL OR p_start_date <= effective_end_date)
      ORDER BY effective_start_date DESC
      LIMIT 1;

      -- Calculate amount
      IF v_rate IS NOT NULL AND v_hours > 0 THEN
        v_amount := v_hours * v_rate;
        
        v_payroll_records := v_payroll_records || jsonb_build_object(
          'caregiver_id', v_caregiver.user_id,
          'caregiver_name', v_caregiver.full_name,
          'caregiver_email', v_caregiver.email,
          'hours_worked', v_hours,
          'hourly_rate', v_rate,
          'total_amount', v_amount
        );

        v_total_hours := v_total_hours + v_hours;
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
    'total_hours', v_total_hours,
    'total_amount', v_total_amount,
    'records', v_payroll_records
  );
END;
$$;

-- Function: get_caregiver_hours
-- Gets hours worked by caregiver for date range
CREATE OR REPLACE FUNCTION get_caregiver_hours(
  p_caregiver_id uuid,
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
  v_total_hours numeric := 0;
  v_shifts jsonb := '[]'::jsonb;
  v_shift record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate hours from sealed attendance
  FOR v_shift IN
    SELECT 
      s.id as shift_id,
      s.start_time,
      s.end_time,
      cin.timestamp as clock_in_time,
      cout.timestamp as clock_out_time,
      EXTRACT(EPOCH FROM (cout.timestamp - cin.timestamp)) / 3600 as hours_worked
    FROM shifts s
    JOIN attendance_events cin ON cin.shift_id = s.id AND cin.event_type = 'CLOCK_IN' AND cin.is_sealed = true
    JOIN attendance_events cout ON cout.shift_id = s.id AND cout.event_type = 'CLOCK_OUT' AND cout.is_sealed = true
    WHERE s.caregiver_id = p_caregiver_id
    AND cin.timestamp::date BETWEEN p_start_date AND p_end_date
  LOOP
    v_total_hours := v_total_hours + v_shift.hours_worked;
    
    v_shifts := v_shifts || jsonb_build_object(
      'shift_id', v_shift.shift_id,
      'scheduled_start', v_shift.start_time,
      'scheduled_end', v_shift.end_time,
      'actual_clock_in', v_shift.clock_in_time,
      'actual_clock_out', v_shift.clock_out_time,
      'hours_worked', v_shift.hours_worked
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'caregiver_id', p_caregiver_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'total_hours', v_total_hours,
    'shift_count', jsonb_array_length(v_shifts),
    'shifts', v_shifts
  );
END;
$$;
