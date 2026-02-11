/*
  # Rostering Dashboard RPCs (Phase 23)

  ## Purpose
  RPC functions for rostering dashboard displays.
  Supervisor-only view of scheduling data.

  ## Functions
  1. get_rostering_dashboard - Get complete dashboard data
  2. get_coverage_gaps - Find coverage gaps
  3. get_overlapping_shifts - Find overlapping shifts
  4. get_caregiver_workload - Get workload metrics

  ## Security
  - Supervisor/admin only
  - No auto-assignment permitted
  - Advisory data only
*/

-- Function: get_rostering_dashboard
-- Gets complete rostering dashboard data
CREATE OR REPLACE FUNCTION get_rostering_dashboard(
  p_start_date timestamptz,
  p_end_date timestamptz
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
  v_current_assignments json;
  v_caregiver_workloads json;
  v_total_shifts integer;
  v_tentative_shifts integer;
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

  -- Only supervisors and admins can view dashboard
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can view rostering dashboard';
  END IF;

  -- Get current assignments
  SELECT json_agg(
    json_build_object(
      'shift_id', s.id,
      'caregiver_id', s.caregiver_id,
      'caregiver_name', up.full_name,
      'start_time', s.start_time,
      'end_time', s.end_time,
      'status', s.status,
      'is_tentative', s.is_tentative,
      'resident_count', (SELECT COUNT(*) FROM shift_resident_assignments WHERE shift_id = s.id),
      'expected_care_intensity', s.expected_care_intensity
    ) ORDER BY s.start_time
  )
  INTO v_current_assignments
  FROM shifts s
  JOIN user_profiles up ON up.id = s.caregiver_id
  WHERE s.agency_id = v_agency_id
  AND s.start_time >= p_start_date
  AND s.end_time <= p_end_date
  AND s.status NOT IN ('CANCELLED');

  -- Get caregiver workloads
  SELECT json_agg(
    json_build_object(
      'caregiver_id', cg.caregiver_id,
      'caregiver_name', up.full_name,
      'shift_count', cg.shift_count,
      'total_hours', cg.total_hours,
      'resident_count', cg.resident_count,
      'avg_care_intensity', cg.avg_care_intensity
    ) ORDER BY cg.total_hours DESC
  )
  INTO v_caregiver_workloads
  FROM (
    SELECT 
      s.caregiver_id,
      COUNT(*) as shift_count,
      SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) as total_hours,
      SUM((SELECT COUNT(*) FROM shift_resident_assignments WHERE shift_id = s.id)) as resident_count,
      AVG(CASE s.expected_care_intensity
        WHEN 'LOW' THEN 1
        WHEN 'MEDIUM' THEN 2
        WHEN 'HIGH' THEN 3
        WHEN 'CRITICAL' THEN 4
        ELSE 2
      END) as avg_care_intensity
    FROM shifts s
    WHERE s.agency_id = v_agency_id
    AND s.start_time >= p_start_date
    AND s.end_time <= p_end_date
    AND s.status NOT IN ('CANCELLED')
    GROUP BY s.caregiver_id
  ) cg
  JOIN user_profiles up ON up.id = cg.caregiver_id;

  -- Get shift counts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_tentative = true)
  INTO v_total_shifts, v_tentative_shifts
  FROM shifts
  WHERE agency_id = v_agency_id
  AND start_time >= p_start_date
  AND end_time <= p_end_date
  AND status NOT IN ('CANCELLED');

  RETURN json_build_object(
    'success', true,
    'date_range', json_build_object('start', p_start_date, 'end', p_end_date),
    'summary', json_build_object(
      'total_shifts', v_total_shifts,
      'tentative_shifts', v_tentative_shifts,
      'confirmed_shifts', v_total_shifts - v_tentative_shifts
    ),
    'current_assignments', COALESCE(v_current_assignments, '[]'::json),
    'caregiver_workloads', COALESCE(v_caregiver_workloads, '[]'::json)
  );
END;
$$;

-- Function: get_coverage_gaps
-- Identifies residents without scheduled coverage
CREATE OR REPLACE FUNCTION get_coverage_gaps(
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
  v_gaps json;
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

  -- Only supervisors and admins can view coverage gaps
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Find residents with no scheduled shifts in date range
  SELECT json_agg(
    json_build_object(
      'resident_id', r.id,
      'resident_name', r.full_name,
      'required_care_frequency', rb.care_frequency_per_week,
      'last_scheduled_shift', (
        SELECT MAX(s.end_time)
        FROM shifts s
        JOIN shift_resident_assignments sra ON sra.shift_id = s.id
        WHERE sra.resident_id = r.id
        AND s.status NOT IN ('CANCELLED')
      )
    )
  )
  INTO v_gaps
  FROM residents r
  LEFT JOIN resident_baselines rb ON rb.resident_id = r.id AND rb.is_sealed = true
  WHERE r.agency_id = v_agency_id
  AND r.status = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM shift_resident_assignments sra
    JOIN shifts s ON s.id = sra.shift_id
    WHERE sra.resident_id = r.id
    AND s.start_time::date >= p_start_date
    AND s.end_time::date <= p_end_date
    AND s.status NOT IN ('CANCELLED')
  );

  RETURN json_build_object(
    'success', true,
    'coverage_gaps', COALESCE(v_gaps, '[]'::json),
    'gap_count', COALESCE(jsonb_array_length(v_gaps::jsonb), 0)
  );
END;
$$;

-- Function: get_overlapping_shifts
-- Finds overlapping shifts for same caregiver
CREATE OR REPLACE FUNCTION get_overlapping_shifts(
  p_start_date timestamptz,
  p_end_date timestamptz
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
  v_overlaps json;
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

  -- Only supervisors and admins can view overlaps
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Find overlapping shifts
  SELECT json_agg(
    json_build_object(
      'caregiver_id', s1.caregiver_id,
      'caregiver_name', up.full_name,
      'shift1_id', s1.id,
      'shift1_time', json_build_object('start', s1.start_time, 'end', s1.end_time),
      'shift2_id', s2.id,
      'shift2_time', json_build_object('start', s2.start_time, 'end', s2.end_time),
      'overlap_minutes', EXTRACT(EPOCH FROM (LEAST(s1.end_time, s2.end_time) - GREATEST(s1.start_time, s2.start_time))) / 60
    )
  )
  INTO v_overlaps
  FROM shifts s1
  JOIN shifts s2 ON s1.caregiver_id = s2.caregiver_id AND s1.id < s2.id
  JOIN user_profiles up ON up.id = s1.caregiver_id
  WHERE s1.agency_id = v_agency_id
  AND s1.start_time >= p_start_date
  AND s1.end_time <= p_end_date
  AND s1.status NOT IN ('CANCELLED')
  AND s2.status NOT IN ('CANCELLED')
  AND s1.start_time < s2.end_time
  AND s1.end_time > s2.start_time;

  RETURN json_build_object(
    'success', true,
    'overlapping_shifts', COALESCE(v_overlaps, '[]'::json),
    'overlap_count', COALESCE(jsonb_array_length(v_overlaps::jsonb), 0)
  );
END;
$$;

-- Function: get_caregiver_workload
-- Gets detailed workload metrics for a caregiver
CREATE OR REPLACE FUNCTION get_caregiver_workload(
  p_caregiver_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workload_data json;
  v_consecutive_shifts integer;
  v_total_hours numeric;
  v_avg_residents_per_shift numeric;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate total hours
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)
  INTO v_total_hours
  FROM shifts
  WHERE caregiver_id = p_caregiver_id
  AND start_time >= p_start_date
  AND end_time <= p_end_date
  AND status NOT IN ('CANCELLED');

  -- Calculate average residents per shift
  SELECT COALESCE(AVG(resident_count), 0)
  INTO v_avg_residents_per_shift
  FROM (
    SELECT COUNT(*) as resident_count
    FROM shifts s
    JOIN shift_resident_assignments sra ON sra.shift_id = s.id
    WHERE s.caregiver_id = p_caregiver_id
    AND s.start_time >= p_start_date
    AND s.end_time <= p_end_date
    AND s.status NOT IN ('CANCELLED')
    GROUP BY s.id
  ) sub;

  -- Count consecutive shifts
  SELECT COUNT(*)
  INTO v_consecutive_shifts
  FROM (
    SELECT id, start_time, end_time,
           LAG(end_time) OVER (ORDER BY start_time) as prev_end_time
    FROM shifts
    WHERE caregiver_id = p_caregiver_id
    AND start_time >= p_start_date
    AND end_time <= p_end_date
    AND status NOT IN ('CANCELLED')
  ) sub
  WHERE prev_end_time IS NULL OR EXTRACT(EPOCH FROM (start_time - prev_end_time)) / 3600 < 24;

  RETURN json_build_object(
    'success', true,
    'caregiver_id', p_caregiver_id,
    'workload', json_build_object(
      'total_hours', v_total_hours,
      'avg_residents_per_shift', v_avg_residents_per_shift,
      'consecutive_shifts', v_consecutive_shifts
    )
  );
END;
$$;
