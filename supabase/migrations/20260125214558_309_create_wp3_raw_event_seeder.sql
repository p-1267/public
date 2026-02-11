/*
  # WP3 Raw Event Seeder - Truth Enforced

  1. Purpose
    - Seed ONLY raw events (tasks, meds, vitals, evidence)
    - Create 30 days of history with detectable patterns
    - Brain must COMPUTE intelligence from these events

  2. Patterns Created
    - 2 residents: rising BP trend (should flag vital_sign_trend)
    - 2 residents: missed medications (should flag medication_adherence)
    - 1 resident: rushed care pattern (should flag rushed_care_pattern)
    - 2 caregivers: high task volume (should flag caregiver_workload)
    - 2 caregivers: slow completion times (should flag caregiver_performance)
    - 3 residents: normal (baseline comparison)
    - 2 caregivers: normal (baseline comparison)

  3. NO direct seeding of:
    - anomaly_detections
    - risk_scores
    - prioritized_issues
    - explainability_narratives
*/

CREATE OR REPLACE FUNCTION seed_wp3_raw_events(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident_ids uuid[];
  v_caregiver_ids uuid[];
  v_category_ids uuid[];
  v_med_category_id uuid;
  v_vital_category_id uuid;
  v_adl_category_id uuid;
  v_day_offset int;
  v_task_count int := 0;
  v_med_count int := 0;
  v_vital_count int := 0;
  v_evidence_count int := 0;
BEGIN
  -- Get residents (need at least 8: 5 with patterns + 3 normal)
  SELECT array_agg(id) INTO v_resident_ids FROM residents WHERE agency_id = p_agency_id LIMIT 8;
  IF v_resident_ids IS NULL OR array_length(v_resident_ids, 1) < 8 THEN
    RAISE EXCEPTION 'Need at least 8 residents for WP3 raw event seeding';
  END IF;

  -- Get caregivers (need at least 6: 4 with patterns + 2 normal)
  SELECT array_agg(id) INTO v_caregiver_ids FROM user_profiles WHERE agency_id = p_agency_id LIMIT 6;
  IF v_caregiver_ids IS NULL OR array_length(v_caregiver_ids, 1) < 6 THEN
    RAISE EXCEPTION 'Need at least 6 caregivers for WP3 raw event seeding';
  END IF;

  -- Get task categories
  SELECT id INTO v_med_category_id FROM task_categories WHERE category_name = 'medication' LIMIT 1;
  SELECT id INTO v_vital_category_id FROM task_categories WHERE category_name = 'vitals' LIMIT 1;
  SELECT id INTO v_adl_category_id FROM task_categories WHERE category_name = 'adl' LIMIT 1;

  -- Create 30 days of history
  FOR v_day_offset IN 0..29 LOOP
    -- PATTERN 1: Residents 1-2 with rising BP trend
    FOR i IN 1..2 LOOP
      INSERT INTO vital_signs (
        agency_id, resident_id, recorded_by,
        blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, temperature, oxygen_saturation,
        measured_at, created_at
      ) VALUES (
        p_agency_id, v_resident_ids[i], v_caregiver_ids[1],
        115 + v_day_offset + (i * 2), 75 + (v_day_offset / 2),
        72, 98.6, 97,
        now() - interval '1 day' * v_day_offset,
        now() - interval '1 day' * v_day_offset
      );
      v_vital_count := v_vital_count + 1;
    END LOOP;

    -- PATTERN 2: Residents 3-4 with missed medications (every 3rd day)
    FOR i IN 3..4 LOOP
      IF v_day_offset % 3 = 0 THEN
        -- Create medication but DON'T complete it (missed)
        INSERT INTO resident_medications (
          agency_id, resident_id,
          medication_name, dosage, route, frequency,
          status, created_at
        ) VALUES (
          p_agency_id, v_resident_ids[i],
          'Lisinopril', '10mg', 'oral', 'daily',
          'active', now() - interval '1 day' * v_day_offset
        );
        v_med_count := v_med_count + 1;
      ELSE
        -- Normal med administration
        INSERT INTO medication_administration (
          agency_id, resident_id, administered_by,
          scheduled_time, administered_at, status,
          created_at
        ) VALUES (
          p_agency_id, v_resident_ids[i], v_caregiver_ids[2],
          now() - interval '1 day' * v_day_offset,
          now() - interval '1 day' * v_day_offset,
          'administered', now() - interval '1 day' * v_day_offset
        );
        v_med_count := v_med_count + 1;
      END IF;
    END LOOP;

    -- PATTERN 3: Resident 5 with rushed care (completion < 10 seconds)
    INSERT INTO tasks (
      agency_id, resident_id, assigned_to, category_id,
      title, state, scheduled_for, completed_at, completed_by, created_at
    ) VALUES (
      p_agency_id, v_resident_ids[5], v_caregiver_ids[3], v_adl_category_id,
      'Morning ADL Care', 'completed',
      now() - interval '1 day' * v_day_offset,
      now() - interval '1 day' * v_day_offset + interval '5 seconds',
      v_caregiver_ids[3], now() - interval '1 day' * v_day_offset
    );
    
    INSERT INTO task_completion_telemetry (
      task_id, caregiver_id, resident_id, agency_id,
      completion_method, completion_seconds, evidence_submitted,
      created_at
    ) SELECT 
      id, v_caregiver_ids[3], v_resident_ids[5], p_agency_id,
      'quick_tap', 5, false,
      now() - interval '1 day' * v_day_offset
    FROM tasks WHERE resident_id = v_resident_ids[5] 
    ORDER BY created_at DESC LIMIT 1;
    
    v_task_count := v_task_count + 1;

    -- PATTERN 4: Caregivers 1-2 with high task volume (>50 tasks per day)
    FOR i IN 1..2 LOOP
      FOR j IN 1..12 LOOP
        INSERT INTO tasks (
          agency_id, resident_id, assigned_to, category_id,
          title, state, scheduled_for, completed_at, completed_by, created_at
        ) VALUES (
          p_agency_id, v_resident_ids[6], v_caregiver_ids[i], v_adl_category_id,
          'Task ' || j, 'completed',
          now() - interval '1 day' * v_day_offset,
          now() - interval '1 day' * v_day_offset + interval '30 seconds',
          v_caregiver_ids[i], now() - interval '1 day' * v_day_offset
        );
        
        INSERT INTO task_completion_telemetry (
          task_id, caregiver_id, resident_id, agency_id,
          completion_method, completion_seconds, evidence_submitted,
          created_at
        ) SELECT 
          id, v_caregiver_ids[i], v_resident_ids[6], p_agency_id,
          'quick_tap', 25, false,
          now() - interval '1 day' * v_day_offset
        FROM tasks WHERE completed_by = v_caregiver_ids[i]
        ORDER BY created_at DESC LIMIT 1;
        
        v_task_count := v_task_count + 1;
      END LOOP;
    END LOOP;

    -- PATTERN 5: Caregivers 3-4 with slow completion times (baseline will be ~45s, these are 90s)
    FOR i IN 3..4 LOOP
      INSERT INTO tasks (
        agency_id, resident_id, assigned_to, category_id,
        title, state, scheduled_for, completed_at, completed_by, created_at
      ) VALUES (
        p_agency_id, v_resident_ids[7], v_caregiver_ids[i], v_adl_category_id,
        'Daily Task', 'completed',
        now() - interval '1 day' * v_day_offset,
        now() - interval '1 day' * v_day_offset + interval '90 seconds',
        v_caregiver_ids[i], now() - interval '1 day' * v_day_offset
      );
      
      INSERT INTO task_completion_telemetry (
        task_id, caregiver_id, resident_id, agency_id,
        completion_method, completion_seconds, evidence_submitted,
        created_at
      ) SELECT 
        id, v_caregiver_ids[i], v_resident_ids[7], p_agency_id,
        'quick_tap', 90, false,
        now() - interval '1 day' * v_day_offset
      FROM tasks WHERE completed_by = v_caregiver_ids[i]
      ORDER BY created_at DESC LIMIT 1;
      
      v_task_count := v_task_count + 1;
    END LOOP;

    -- Normal baseline data for residents 6-8 and caregivers 5-6
    INSERT INTO vital_signs (
      agency_id, resident_id, recorded_by,
      blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, temperature, oxygen_saturation,
      measured_at, created_at
    ) VALUES (
      p_agency_id, v_resident_ids[6], v_caregiver_ids[5],
      120, 80, 72, 98.6, 97,
      now() - interval '1 day' * v_day_offset,
      now() - interval '1 day' * v_day_offset
    );
    v_vital_count := v_vital_count + 1;

    FOR i IN 5..6 LOOP
      INSERT INTO tasks (
        agency_id, resident_id, assigned_to, category_id,
        title, state, scheduled_for, completed_at, completed_by, created_at
      ) VALUES (
        p_agency_id, v_resident_ids[8], v_caregiver_ids[i], v_adl_category_id,
        'Normal Task', 'completed',
        now() - interval '1 day' * v_day_offset,
        now() - interval '1 day' * v_day_offset + interval '45 seconds',
        v_caregiver_ids[i], now() - interval '1 day' * v_day_offset
      );
      
      INSERT INTO task_completion_telemetry (
        task_id, caregiver_id, resident_id, agency_id,
        completion_method, completion_seconds, evidence_submitted,
        created_at
      ) SELECT 
        id, v_caregiver_ids[i], v_resident_ids[8], p_agency_id,
        'quick_tap', 45, true,
        now() - interval '1 day' * v_day_offset
      FROM tasks WHERE completed_by = v_caregiver_ids[i]
      ORDER BY created_at DESC LIMIT 1;
      
      v_task_count := v_task_count + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Raw events seeded - Brain must compute intelligence',
    'tasks_created', v_task_count,
    'medications_created', v_med_count,
    'vitals_created', v_vital_count,
    'telemetry_created', v_task_count,
    'patterns_embedded', jsonb_build_object(
      'rising_bp_residents', 2,
      'missed_med_residents', 2,
      'rushed_care_residents', 1,
      'high_volume_caregivers', 2,
      'slow_caregivers', 2,
      'normal_residents', 3,
      'normal_caregivers', 2
    )
  );
END;
$$;
