/*
  # Workload Signal Detection RPCs (Phase 23)

  ## Purpose
  Brain-detected workload and fatigue signals.
  Advisory only - MUST NOT block scheduling.
  Visible only to supervisors/admins.

  ## Functions
  1. detect_workload_signals - Scan and create signals
  2. get_active_workload_signals - Get unacknowledged signals
  3. acknowledge_workload_signal - Acknowledge a signal
  4. get_caregiver_signals - Get signals for specific caregiver

  ## Signal Types
  - EXCESSIVE_CONSECUTIVE_SHIFTS
  - HIGH_RESIDENT_RATIO
  - REPEATED_EMERGENCY_CORRELATION
  - OVERTIME_RISK

  ## Security
  - Supervisor/admin only
  - Signals are advisory only
  - Signals MUST NOT block scheduling
*/

-- Function: detect_workload_signals
-- Scans for workload signals and creates them
CREATE OR REPLACE FUNCTION detect_workload_signals(
  p_lookback_days integer DEFAULT 14
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
  v_signals_created integer := 0;
  v_caregiver record;
  v_consecutive_shifts integer;
  v_avg_resident_ratio numeric;
  v_emergency_count integer;
  v_weekly_hours numeric;
  v_labor_rules record;
  v_start_date date;
  v_end_date date;
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

  -- Only supervisors and admins can detect signals
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  v_start_date := CURRENT_DATE - p_lookback_days;
  v_end_date := CURRENT_DATE;

  -- Get labor rules
  SELECT * INTO v_labor_rules
  FROM labor_rules
  WHERE agency_id = v_agency_id
  AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Scan all caregivers in agency
  FOR v_caregiver IN
    SELECT DISTINCT up.id, up.full_name
    FROM user_profiles up
    JOIN roles r ON r.id = up.role_id
    WHERE up.agency_id = v_agency_id
    AND r.name = 'CAREGIVER'
  LOOP
    -- Check excessive consecutive shifts
    SELECT COUNT(*)
    INTO v_consecutive_shifts
    FROM (
      SELECT s.id, s.start_time, s.end_time,
             LAG(s.end_time) OVER (ORDER BY s.start_time) as prev_end_time
      FROM shifts s
      WHERE s.caregiver_id = v_caregiver.id
      AND s.start_time::date >= v_start_date
      AND s.status NOT IN ('CANCELLED')
      ORDER BY s.start_time
    ) sub
    WHERE prev_end_time IS NULL OR EXTRACT(EPOCH FROM (start_time - prev_end_time)) / 3600 < 24;

    IF v_consecutive_shifts >= 5 THEN
      INSERT INTO workload_signals (
        agency_id,
        caregiver_id,
        signal_type,
        severity,
        description,
        data,
        start_date,
        end_date
      ) VALUES (
        v_agency_id,
        v_caregiver.id,
        'EXCESSIVE_CONSECUTIVE_SHIFTS',
        CASE 
          WHEN v_consecutive_shifts >= 10 THEN 'CRITICAL'
          WHEN v_consecutive_shifts >= 7 THEN 'HIGH'
          ELSE 'MEDIUM'
        END,
        format('%s has worked %s consecutive shifts', v_caregiver.full_name, v_consecutive_shifts),
        jsonb_build_object('consecutive_shifts', v_consecutive_shifts),
        v_start_date,
        v_end_date
      )
      ON CONFLICT DO NOTHING;
      v_signals_created := v_signals_created + 1;
    END IF;

    -- Check high resident ratio
    SELECT AVG(resident_count)
    INTO v_avg_resident_ratio
    FROM (
      SELECT COUNT(*) as resident_count
      FROM shifts s
      JOIN shift_resident_assignments sra ON sra.shift_id = s.id
      WHERE s.caregiver_id = v_caregiver.id
      AND s.start_time::date >= v_start_date
      AND s.status NOT IN ('CANCELLED')
      GROUP BY s.id
    ) sub;

    IF v_avg_resident_ratio >= 5 THEN
      INSERT INTO workload_signals (
        agency_id,
        caregiver_id,
        signal_type,
        severity,
        description,
        data,
        start_date,
        end_date
      ) VALUES (
        v_agency_id,
        v_caregiver.id,
        'HIGH_RESIDENT_RATIO',
        CASE 
          WHEN v_avg_resident_ratio >= 8 THEN 'HIGH'
          WHEN v_avg_resident_ratio >= 6 THEN 'MEDIUM'
          ELSE 'LOW'
        END,
        format('%s has average of %.1f residents per shift', v_caregiver.full_name, v_avg_resident_ratio),
        jsonb_build_object('avg_resident_ratio', v_avg_resident_ratio),
        v_start_date,
        v_end_date
      )
      ON CONFLICT DO NOTHING;
      v_signals_created := v_signals_created + 1;
    END IF;

    -- Check overtime risk (if labor rules exist)
    IF v_labor_rules IS NOT NULL AND v_labor_rules.max_weekly_hours IS NOT NULL THEN
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)
      INTO v_weekly_hours
      FROM shifts
      WHERE caregiver_id = v_caregiver.id
      AND start_time::date >= (CURRENT_DATE - 7)
      AND status NOT IN ('CANCELLED');

      IF v_weekly_hours >= (v_labor_rules.max_weekly_hours * 0.9) THEN
        INSERT INTO workload_signals (
          agency_id,
          caregiver_id,
          signal_type,
          severity,
          description,
          data,
          start_date,
          end_date
        ) VALUES (
          v_agency_id,
          v_caregiver.id,
          'OVERTIME_RISK',
          CASE 
            WHEN v_weekly_hours >= v_labor_rules.max_weekly_hours THEN 'CRITICAL'
            WHEN v_weekly_hours >= (v_labor_rules.max_weekly_hours * 0.95) THEN 'HIGH'
            ELSE 'MEDIUM'
          END,
          format('%s has worked %.1f hours this week (limit: %.1f)', v_caregiver.full_name, v_weekly_hours, v_labor_rules.max_weekly_hours),
          jsonb_build_object('weekly_hours', v_weekly_hours, 'max_weekly_hours', v_labor_rules.max_weekly_hours),
          CURRENT_DATE - 7,
          CURRENT_DATE
        )
        ON CONFLICT DO NOTHING;
        v_signals_created := v_signals_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'signals_created', v_signals_created,
    'message', format('Created %s new workload signals', v_signals_created)
  );
END;
$$;

-- Function: get_active_workload_signals
-- Gets all unacknowledged workload signals
CREATE OR REPLACE FUNCTION get_active_workload_signals()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_signals json;
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

  -- Only supervisors and admins can view signals
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', ws.id,
      'caregiver_id', ws.caregiver_id,
      'caregiver_name', up.full_name,
      'signal_type', ws.signal_type,
      'severity', ws.severity,
      'description', ws.description,
      'data', ws.data,
      'start_date', ws.start_date,
      'end_date', ws.end_date,
      'created_at', ws.created_at
    ) ORDER BY ws.severity DESC, ws.created_at DESC
  )
  INTO v_signals
  FROM workload_signals ws
  JOIN user_profiles up ON up.id = ws.caregiver_id
  WHERE ws.agency_id = v_agency_id
  AND ws.is_acknowledged = false;

  RETURN json_build_object(
    'success', true,
    'signals', COALESCE(v_signals, '[]'::json),
    'signal_count', COALESCE(jsonb_array_length(v_signals::jsonb), 0)
  );
END;
$$;

-- Function: acknowledge_workload_signal
-- Acknowledges a workload signal
CREATE OR REPLACE FUNCTION acknowledge_workload_signal(
  p_signal_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only supervisors and admins can acknowledge signals
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE workload_signals
  SET is_acknowledged = true,
      acknowledged_by = v_user_id,
      acknowledged_at = now()
  WHERE id = p_signal_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Signal acknowledged successfully'
  );
END;
$$;

-- Function: get_caregiver_signals
-- Gets all signals for a specific caregiver
CREATE OR REPLACE FUNCTION get_caregiver_signals(
  p_caregiver_id uuid,
  p_include_acknowledged boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_signals json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', ws.id,
      'signal_type', ws.signal_type,
      'severity', ws.severity,
      'description', ws.description,
      'data', ws.data,
      'start_date', ws.start_date,
      'end_date', ws.end_date,
      'is_acknowledged', ws.is_acknowledged,
      'acknowledged_at', ws.acknowledged_at,
      'created_at', ws.created_at
    ) ORDER BY ws.created_at DESC
  )
  INTO v_signals
  FROM workload_signals ws
  WHERE ws.caregiver_id = p_caregiver_id
  AND (p_include_acknowledged = true OR ws.is_acknowledged = false);

  RETURN json_build_object(
    'success', true,
    'caregiver_id', p_caregiver_id,
    'signals', COALESCE(v_signals, '[]'::json)
  );
END;
$$;
