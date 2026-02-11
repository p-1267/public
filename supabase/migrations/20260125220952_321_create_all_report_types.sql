/*
  # WP5: All Report Types - Derived Intelligence

  1. Report Types
    - Daily Summary: Department/manager overview
    - Incident Narrative: Timeline reconstruction  
    - Family Update: Filtered + redacted for families

  2. Truth Enforcement
    - All computed from real data
    - Include Brain outputs
    - Evidence links verifiable
    - Redaction rules enforced
*/

-- ============================================================
-- DAILY SUMMARY REPORT
-- ============================================================

CREATE OR REPLACE FUNCTION compute_daily_summary_data(
  p_agency_id uuid,
  p_report_date date,
  p_department_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tasks_stats jsonb;
  v_attendance_stats jsonb;
  v_health_trends jsonb;
  v_brain_risks jsonb;
  v_exceptions jsonb;
  v_data_hash text;
BEGIN
  -- Task completion metrics
  SELECT jsonb_build_object(
    'total_scheduled', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'missed', COUNT(*) FILTER (WHERE status = 'missed'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'completion_rate', ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0)) * 100, 1),
    'by_category', (
      SELECT jsonb_object_agg(
        category,
        jsonb_build_object(
          'total', count,
          'completed', completed_count,
          'completion_rate', ROUND((completed_count::numeric / NULLIF(count, 0)) * 100, 1)
        )
      )
      FROM (
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count
        FROM core_tasks
        WHERE agency_id = p_agency_id
          AND scheduled_time::date = p_report_date
          AND (p_department_id IS NULL OR department_id = p_department_id)
        GROUP BY category
      ) cat_stats
    )
  ) INTO v_tasks_stats
  FROM core_tasks
  WHERE agency_id = p_agency_id
    AND scheduled_time::date = p_report_date
    AND (p_department_id IS NULL OR department_id = p_department_id);

  -- Attendance metrics
  SELECT jsonb_build_object(
    'total_staff', COUNT(DISTINCT user_id),
    'on_time', COUNT(*) FILTER (WHERE status = 'on_time'),
    'late', COUNT(*) FILTER (WHERE status = 'late'),
    'absent', COUNT(*) FILTER (WHERE status = 'absent'),
    'attendance_rate', ROUND((COUNT(*) FILTER (WHERE status IN ('on_time', 'late'))::numeric / NULLIF(COUNT(*), 0)) * 100, 1)
  ) INTO v_attendance_stats
  FROM attendance_events
  WHERE agency_id = p_agency_id
    AND event_date = p_report_date
    AND (p_department_id IS NULL OR department_id = p_department_id);

  -- Health trends (vitals abnormalities)
  SELECT jsonb_build_object(
    'total_vitals_recorded', COUNT(*),
    'abnormal_readings', COUNT(*) FILTER (WHERE is_flagged_abnormal = true),
    'residents_with_abnormals', COUNT(DISTINCT resident_id) FILTER (WHERE is_flagged_abnormal = true),
    'abnormality_rate', ROUND((COUNT(*) FILTER (WHERE is_flagged_abnormal = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 1)
  ) INTO v_health_trends
  FROM vital_signs
  WHERE agency_id = p_agency_id
    AND recorded_at::date = p_report_date;

  -- Brain risk assessments (WP3)
  SELECT jsonb_agg(
    jsonb_build_object(
      'resident_id', r.id,
      'resident_name', r.name,
      'risk_type', rs.risk_type,
      'risk_level', rs.risk_level,
      'confidence', rs.confidence,
      'contributing_factors', rs.contributing_factors,
      'recommended_actions', rs.recommended_actions
    ) ORDER BY rs.risk_level DESC, rs.confidence DESC
  ) INTO v_brain_risks
  FROM risk_scores rs
  LEFT JOIN residents r ON r.id = rs.resident_id
  WHERE rs.agency_id = p_agency_id
    AND rs.computed_at::date = p_report_date
    AND rs.risk_level IN ('high', 'critical');

  -- Exceptions requiring attention
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', exception_type,
      'resident_name', r.name,
      'description', description,
      'severity', severity,
      'detected_at', detected_at
    ) ORDER BY severity DESC, detected_at DESC
  ) INTO v_exceptions
  FROM (
    SELECT 
      'missed_medication' as exception_type,
      resident_id,
      'Missed medication: ' || rm.medication_name as description,
      'high' as severity,
      scheduled_time as detected_at
    FROM medication_administration ma
    LEFT JOIN resident_medications rm ON rm.id = ma.medication_id
    WHERE ma.agency_id = p_agency_id
      AND ma.scheduled_time::date = p_report_date
      AND ma.status = 'missed'
    
    UNION ALL
    
    SELECT 
      'missed_task' as exception_type,
      resident_id,
      'Missed task: ' || title as description,
      CASE priority WHEN 'critical' THEN 'critical' WHEN 'high' THEN 'high' ELSE 'medium' END as severity,
      scheduled_time as detected_at
    FROM core_tasks
    WHERE agency_id = p_agency_id
      AND scheduled_time::date = p_report_date
      AND status = 'missed'
      AND priority IN ('critical', 'high')
    
    UNION ALL
    
    SELECT 
      'incident' as exception_type,
      resident_id,
      'Incident: ' || incident_type as description,
      severity,
      occurred_at as detected_at
    FROM incident_log
    WHERE agency_id = p_agency_id
      AND occurred_at::date = p_report_date
  ) exc
  LEFT JOIN residents r ON r.id = exc.resident_id
  LIMIT 20;

  -- Calculate data hash
  v_data_hash := md5(
    COALESCE(v_tasks_stats::text, '') ||
    COALESCE(v_attendance_stats::text, '') ||
    COALESCE(v_health_trends::text, '') ||
    COALESCE(v_brain_risks::text, '') ||
    COALESCE(v_exceptions::text, '')
  );

  RETURN jsonb_build_object(
    'report_date', p_report_date,
    'department_id', p_department_id,
    'data_hash', v_data_hash,
    'extracted_at', now(),
    'tasks_stats', COALESCE(v_tasks_stats, '{}'::jsonb),
    'attendance_stats', COALESCE(v_attendance_stats, '{}'::jsonb),
    'health_trends', COALESCE(v_health_trends, '{}'::jsonb),
    'brain_risks', COALESCE(v_brain_risks, '[]'::jsonb),
    'exceptions', COALESCE(v_exceptions, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION generate_daily_summary(
  p_agency_id uuid,
  p_report_date date,
  p_department_id uuid DEFAULT NULL,
  p_triggered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_report_id uuid;
  v_template record;
  v_data jsonb;
  v_narrative jsonb;
  v_start_time timestamptz := now();
  v_duration_ms int;
BEGIN
  -- Log generation start
  INSERT INTO report_generation_log (
    agency_id, report_type, generation_trigger, triggered_by, status, processing_started_at
  ) VALUES (
    p_agency_id, 'daily_summary',
    CASE WHEN p_triggered_by IS NULL THEN 'scheduled' ELSE 'manual' END,
    p_triggered_by, 'processing', now()
  )
  RETURNING id INTO v_log_id;

  -- Get template
  SELECT * INTO v_template
  FROM report_templates
  WHERE report_type = 'daily_summary' AND is_active = true
  ORDER BY version DESC LIMIT 1;

  -- Extract data
  v_data := compute_daily_summary_data(p_agency_id, p_report_date, p_department_id);

  -- Generate narrative
  v_narrative := jsonb_build_object(
    'title', 'Daily Summary - ' || to_char(p_report_date, 'Mon DD, YYYY'),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'heading', 'Task Performance',
        'content', format(
          'Task completion rate: %s%% (%s of %s tasks completed). %s tasks missed requiring follow-up.',
          v_data->'tasks_stats'->>'completion_rate',
          v_data->'tasks_stats'->>'completed',
          v_data->'tasks_stats'->>'total_scheduled',
          v_data->'tasks_stats'->>'missed'
        ),
        'data', v_data->'tasks_stats'
      ),
      jsonb_build_object(
        'heading', 'Staffing',
        'content', format(
          'Attendance rate: %s%% (%s staff present, %s late, %s absent).',
          v_data->'attendance_stats'->>'attendance_rate',
          (v_data->'attendance_stats'->>'on_time')::int + (v_data->'attendance_stats'->>'late')::int,
          v_data->'attendance_stats'->>'late',
          v_data->'attendance_stats'->>'absent'
        ),
        'data', v_data->'attendance_stats'
      ),
      jsonb_build_object(
        'heading', 'Health Trends',
        'content', format(
          '%s vital signs recorded. %s abnormal readings detected (%s%% abnormality rate) affecting %s residents.',
          v_data->'health_trends'->>'total_vitals_recorded',
          v_data->'health_trends'->>'abnormal_readings',
          v_data->'health_trends'->>'abnormality_rate',
          v_data->'health_trends'->>'residents_with_abnormals'
        ),
        'data', v_data->'health_trends'
      ),
      jsonb_build_object(
        'heading', 'Brain Intelligence: High-Risk Alerts',
        'content', CASE
          WHEN jsonb_array_length(v_data->'brain_risks') > 0 THEN
            format('%s high/critical risk alerts identified. Immediate attention recommended.', jsonb_array_length(v_data->'brain_risks'))
          ELSE
            'No high-risk alerts identified.'
        END,
        'details', v_data->'brain_risks'
      ),
      jsonb_build_object(
        'heading', 'Exceptions Requiring Attention',
        'content', CASE
          WHEN jsonb_array_length(v_data->'exceptions') > 0 THEN
            format('%s exceptions logged requiring management review.', jsonb_array_length(v_data->'exceptions'))
          ELSE
            'No exceptions requiring immediate attention.'
        END,
        'details', v_data->'exceptions'
      )
    )
  );

  -- Create report
  INSERT INTO generated_reports (
    agency_id, report_type, template_id, template_version,
    report_date, department_id,
    report_title, report_content, evidence_links,
    source_data_hash, source_data_snapshot,
    brain_findings, generation_method
  ) VALUES (
    p_agency_id, 'daily_summary', v_template.id, v_template.version,
    p_report_date, p_department_id,
    v_narrative->>'title', v_narrative, '{}'::jsonb,
    v_data->>'data_hash', v_data,
    v_data->'brain_risks', 'heuristic_v1'
  )
  RETURNING id INTO v_report_id;

  v_duration_ms := EXTRACT(EPOCH FROM (now() - v_start_time)) * 1000;

  UPDATE report_generation_log
  SET report_id = v_report_id, status = 'completed',
      processing_completed_at = now(), processing_duration_ms = v_duration_ms
  WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'report_type', 'daily_summary',
    'data_hash', v_data->>'data_hash',
    'processing_duration_ms', v_duration_ms
  );
END;
$$;

-- ============================================================
-- INCIDENT NARRATIVE REPORT
-- ============================================================

CREATE OR REPLACE FUNCTION generate_incident_narrative(
  p_agency_id uuid,
  p_incident_id uuid,
  p_triggered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_report_id uuid;
  v_template record;
  v_incident record;
  v_timeline jsonb;
  v_narrative jsonb;
  v_data_hash text;
  v_start_time timestamptz := now();
  v_duration_ms int;
BEGIN
  -- Log generation start
  INSERT INTO report_generation_log (
    agency_id, report_type, generation_trigger, triggered_by, status, processing_started_at
  ) VALUES (
    p_agency_id, 'incident_narrative',
    CASE WHEN p_triggered_by IS NULL THEN 'scheduled' ELSE 'manual' END,
    p_triggered_by, 'processing', now()
  )
  RETURNING id INTO v_log_id;

  -- Get incident
  SELECT 
    i.*,
    r.name as resident_name,
    u.name as reported_by_name
  INTO v_incident
  FROM incident_log i
  LEFT JOIN residents r ON r.id = i.resident_id
  LEFT JOIN user_profiles u ON u.id = i.reported_by
  WHERE i.id = p_incident_id AND i.agency_id = p_agency_id;

  IF v_incident.id IS NULL THEN
    RAISE EXCEPTION 'Incident not found: %', p_incident_id;
  END IF;

  -- Get template
  SELECT * INTO v_template
  FROM report_templates
  WHERE report_type = 'incident_narrative' AND is_active = true
  ORDER BY version DESC LIMIT 1;

  -- Build timeline (context around incident)
  SELECT jsonb_agg(
    timeline_entry ORDER BY event_time
  ) INTO v_timeline
  FROM (
    -- Tasks before incident
    SELECT 
      scheduled_time as event_time,
      'task' as event_type,
      jsonb_build_object(
        'category', category,
        'title', title,
        'status', status,
        'completed_by', (SELECT name FROM user_profiles WHERE id = completed_by)
      ) as event_data
    FROM core_tasks
    WHERE agency_id = p_agency_id
      AND resident_id = v_incident.resident_id
      AND scheduled_time BETWEEN (v_incident.occurred_at - interval '4 hours') AND v_incident.occurred_at
    
    UNION ALL
    
    -- Vitals before incident
    SELECT 
      recorded_at as event_time,
      'vital_sign' as event_type,
      jsonb_build_object(
        'blood_pressure', blood_pressure_systolic || '/' || blood_pressure_diastolic,
        'heart_rate', heart_rate,
        'is_abnormal', is_flagged_abnormal
      ) as event_data
    FROM vital_signs
    WHERE agency_id = p_agency_id
      AND resident_id = v_incident.resident_id
      AND recorded_at BETWEEN (v_incident.occurred_at - interval '4 hours') AND v_incident.occurred_at
    
    UNION ALL
    
    -- The incident itself
    SELECT 
      v_incident.occurred_at as event_time,
      'incident' as event_type,
      jsonb_build_object(
        'incident_type', v_incident.incident_type,
        'severity', v_incident.severity,
        'description', v_incident.description,
        'reported_by', v_incident.reported_by_name
      ) as event_data
    
    UNION ALL
    
    -- Actions taken after
    SELECT 
      scheduled_time as event_time,
      'response_action' as event_type,
      jsonb_build_object(
        'action', title,
        'status', status,
        'completed_at', completed_at
      ) as event_data
    FROM core_tasks
    WHERE agency_id = p_agency_id
      AND resident_id = v_incident.resident_id
      AND scheduled_time BETWEEN v_incident.occurred_at AND (v_incident.occurred_at + interval '2 hours')
  ) timeline_data;

  -- Generate narrative
  v_narrative := jsonb_build_object(
    'title', 'Incident Report - ' || v_incident.incident_type || ' - ' || to_char(v_incident.occurred_at, 'Mon DD, YYYY HH24:MI'),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'heading', 'Incident Summary',
        'content', format(
          'Incident Type: %s | Severity: %s | Resident: %s | Occurred: %s | Reported by: %s',
          v_incident.incident_type,
          v_incident.severity,
          v_incident.resident_name,
          to_char(v_incident.occurred_at, 'Mon DD, YYYY at HH24:MI'),
          v_incident.reported_by_name
        )
      ),
      jsonb_build_object(
        'heading', 'Description',
        'content', v_incident.description
      ),
      jsonb_build_object(
        'heading', 'Timeline Reconstruction',
        'content', 'See detailed timeline below',
        'timeline', v_timeline
      ),
      jsonb_build_object(
        'heading', 'Actions Taken',
        'content', v_incident.actions_taken
      ),
      jsonb_build_object(
        'heading', 'Outcome',
        'content', v_incident.outcome
      )
    )
  );

  v_data_hash := md5(v_incident::text || v_timeline::text);

  -- Create report
  INSERT INTO generated_reports (
    agency_id, report_type, template_id, template_version,
    report_date, resident_id, incident_id,
    report_title, report_content, evidence_links,
    source_data_hash, source_data_snapshot, generation_method
  ) VALUES (
    p_agency_id, 'incident_narrative', v_template.id, v_template.version,
    v_incident.occurred_at::date, v_incident.resident_id, p_incident_id,
    v_narrative->>'title', v_narrative, jsonb_build_object('timeline', v_timeline),
    v_data_hash, jsonb_build_object('incident', to_jsonb(v_incident), 'timeline', v_timeline),
    'heuristic_v1'
  )
  RETURNING id INTO v_report_id;

  v_duration_ms := EXTRACT(EPOCH FROM (now() - v_start_time)) * 1000;

  UPDATE report_generation_log
  SET report_id = v_report_id, status = 'completed',
      processing_completed_at = now(), processing_duration_ms = v_duration_ms
  WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'report_type', 'incident_narrative',
    'data_hash', v_data_hash,
    'processing_duration_ms', v_duration_ms
  );
END;
$$;

-- ============================================================
-- FAMILY UPDATE REPORT (Filtered + Redacted)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_family_update(
  p_agency_id uuid,
  p_resident_id uuid,
  p_report_date date,
  p_triggered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_report_id uuid;
  v_template record;
  v_resident record;
  v_activities jsonb;
  v_health_summary text;
  v_positive_events jsonb;
  v_narrative jsonb;
  v_data_hash text;
  v_start_time timestamptz := now();
  v_duration_ms int;
BEGIN
  -- Log generation
  INSERT INTO report_generation_log (
    agency_id, report_type, generation_trigger, triggered_by, status, processing_started_at
  ) VALUES (
    p_agency_id, 'family_update',
    CASE WHEN p_triggered_by IS NULL THEN 'scheduled' ELSE 'manual' END,
    p_triggered_by, 'processing', now()
  )
  RETURNING id INTO v_log_id;

  -- Get resident
  SELECT * INTO v_resident
  FROM residents
  WHERE id = p_resident_id AND agency_id = p_agency_id;

  -- Get template
  SELECT * INTO v_template
  FROM report_templates
  WHERE report_type = 'family_update' AND is_active = true
  ORDER BY version DESC LIMIT 1;

  -- Extract activities (REDACTED - no staff names, no medical details)
  SELECT jsonb_agg(
    jsonb_build_object(
      'time', to_char(scheduled_time, 'HH12:MI AM'),
      'activity', CASE category
        WHEN 'medication_administration' THEN 'Medication time'
        WHEN 'meal_service' THEN 'Meal service'
        WHEN 'hygiene' THEN 'Personal care'
        WHEN 'social_activity' THEN title
        ELSE 'Care activity'
      END,
      'completed', status = 'completed'
    ) ORDER BY scheduled_time
  ) INTO v_activities
  FROM core_tasks
  WHERE agency_id = p_agency_id
    AND resident_id = p_resident_id
    AND scheduled_time::date = p_report_date
    AND category NOT IN ('clinical_assessment', 'medication_review'); -- Exclude clinical details

  -- Health summary (GENERAL, not specific vitals)
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE is_flagged_abnormal = true) > 0 THEN
      'Health is being monitored. Our care team is providing appropriate attention.'
    ELSE
      format('%s had a good day. Vital signs were checked and are within normal ranges.', v_resident.name)
  END INTO v_health_summary
  FROM vital_signs
  WHERE agency_id = p_agency_id
    AND resident_id = p_resident_id
    AND recorded_at::date = p_report_date;

  -- Positive events (social, activities, achievements)
  SELECT jsonb_agg(
    jsonb_build_object(
      'event', title,
      'time', to_char(scheduled_time, 'HH12:MI AM')
    )
  ) INTO v_positive_events
  FROM core_tasks
  WHERE agency_id = p_agency_id
    AND resident_id = p_resident_id
    AND scheduled_time::date = p_report_date
    AND category IN ('social_activity', 'recreation', 'exercise')
    AND status = 'completed';

  -- Generate narrative (FAMILY-FRIENDLY TONE)
  v_narrative := jsonb_build_object(
    'title', format('Daily Update for %s - %s', v_resident.name, to_char(p_report_date, 'Month DD, YYYY')),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'heading', 'Good Morning!',
        'content', format('Here''s an update on how %s is doing today.', v_resident.name)
      ),
      jsonb_build_object(
        'heading', 'Daily Activities',
        'content', format('%s participated in their regular daily activities and care routines.', v_resident.name),
        'activities', v_activities
      ),
      jsonb_build_object(
        'heading', 'Health & Wellness',
        'content', v_health_summary
      ),
      jsonb_build_object(
        'heading', 'Special Moments',
        'content', CASE
          WHEN v_positive_events IS NOT NULL AND jsonb_array_length(v_positive_events) > 0 THEN
            format('%s enjoyed some special activities today!', v_resident.name)
          ELSE
            format('%s had a peaceful day with regular routines.', v_resident.name)
        END,
        'events', v_positive_events
      ),
      jsonb_build_object(
        'heading', 'Care Team Note',
        'content', format('Our team is committed to providing excellent care for %s. Please reach out if you have any questions or concerns.', v_resident.name)
      )
    )
  );

  v_data_hash := md5(v_activities::text || v_health_summary || v_positive_events::text);

  -- Create report
  INSERT INTO generated_reports (
    agency_id, report_type, template_id, template_version,
    report_date, resident_id,
    report_title, report_content, evidence_links,
    source_data_hash, source_data_snapshot, generation_method
  ) VALUES (
    p_agency_id, 'family_update', v_template.id, v_template.version,
    p_report_date, p_resident_id,
    v_narrative->>'title', v_narrative, '{}'::jsonb,
    v_data_hash, jsonb_build_object('activities', v_activities, 'health_summary', v_health_summary),
    'heuristic_v1'
  )
  RETURNING id INTO v_report_id;

  v_duration_ms := EXTRACT(EPOCH FROM (now() - v_start_time)) * 1000;

  UPDATE report_generation_log
  SET report_id = v_report_id, status = 'completed',
      processing_completed_at = now(), processing_duration_ms = v_duration_ms
  WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'report_type', 'family_update',
    'data_hash', v_data_hash,
    'processing_duration_ms', v_duration_ms,
    'message', 'Family update generated with appropriate redactions'
  );
END;
$$;
