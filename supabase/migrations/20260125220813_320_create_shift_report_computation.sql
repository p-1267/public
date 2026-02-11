/*
  # WP5.1: Shift Report Computation - Derived Intelligence

  1. Purpose
    - Extract operational reality for shift handoff
    - Include Brain findings (WP3)
    - Generate narrative from real data

  2. Functions
    - compute_shift_report_data: Extract facts
    - generate_shift_report: Produce narrative
    - get_shift_report_evidence: Resolve evidence links

  3. Truth Enforcement
    - Pulls from real tasks, vitals, meds, incidents
    - Includes Brain outputs (anomalies, risks)
    - Evidence links are verifiable
*/

-- Compute Shift Report Data (Extract Facts)
CREATE OR REPLACE FUNCTION compute_shift_report_data(
  p_agency_id uuid,
  p_shift_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift record;
  v_tasks jsonb;
  v_vitals jsonb;
  v_medications jsonb;
  v_incidents jsonb;
  v_brain_findings jsonb;
  v_residents jsonb;
  v_data_hash text;
BEGIN
  -- Get shift details
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id
    AND agency_id = p_agency_id;

  IF v_shift.id IS NULL THEN
    RAISE EXCEPTION 'Shift not found: %', p_shift_id;
  END IF;

  -- Extract tasks during shift
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'resident_id', t.resident_id,
      'resident_name', r.name,
      'category', t.category,
      'title', t.title,
      'status', t.status,
      'priority', t.priority,
      'completed_at', t.completed_at,
      'completed_by_name', u.name,
      'has_evidence', t.evidence_photo_url IS NOT NULL OR t.evidence_voice_note_url IS NOT NULL,
      'evidence_links', jsonb_build_object(
        'photo', t.evidence_photo_url,
        'voice', t.evidence_voice_note_url
      )
    ) ORDER BY t.priority DESC, t.scheduled_time
  ) INTO v_tasks
  FROM core_tasks t
  LEFT JOIN residents r ON r.id = t.resident_id
  LEFT JOIN user_profiles u ON u.id = t.completed_by
  WHERE t.agency_id = p_agency_id
    AND t.scheduled_time >= v_shift.shift_start
    AND t.scheduled_time < v_shift.shift_end;

  -- Extract vital signs during shift
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', vs.id,
      'resident_id', vs.resident_id,
      'resident_name', r.name,
      'recorded_at', vs.recorded_at,
      'blood_pressure', vs.blood_pressure_systolic || '/' || vs.blood_pressure_diastolic,
      'heart_rate', vs.heart_rate,
      'temperature', vs.temperature,
      'is_abnormal', vs.is_flagged_abnormal
    ) ORDER BY vs.recorded_at DESC
  ) INTO v_vitals
  FROM vital_signs vs
  LEFT JOIN residents r ON r.id = vs.resident_id
  WHERE vs.agency_id = p_agency_id
    AND vs.recorded_at >= v_shift.shift_start
    AND vs.recorded_at < v_shift.shift_end;

  -- Extract medication administrations during shift
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ma.id,
      'resident_id', ma.resident_id,
      'resident_name', r.name,
      'medication_name', m.medication_name,
      'scheduled_time', ma.scheduled_time,
      'status', ma.status,
      'administered_at', ma.administered_at,
      'administered_by_name', u.name,
      'notes', ma.notes
    ) ORDER BY ma.scheduled_time
  ) INTO v_medications
  FROM medication_administration ma
  LEFT JOIN residents r ON r.id = ma.resident_id
  LEFT JOIN resident_medications m ON m.id = ma.medication_id
  LEFT JOIN user_profiles u ON u.id = ma.administered_by
  WHERE ma.agency_id = p_agency_id
    AND ma.scheduled_time >= v_shift.shift_start
    AND ma.scheduled_time < v_shift.shift_end;

  -- Extract incidents during shift (if any)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'resident_id', i.resident_id,
      'resident_name', r.name,
      'incident_type', i.incident_type,
      'severity', i.severity,
      'occurred_at', i.occurred_at,
      'description', i.description,
      'reported_by_name', u.name
    ) ORDER BY i.occurred_at DESC
  ) INTO v_incidents
  FROM incident_log i
  LEFT JOIN residents r ON r.id = i.resident_id
  LEFT JOIN user_profiles u ON u.id = i.reported_by
  WHERE i.agency_id = p_agency_id
    AND i.occurred_at >= v_shift.shift_start
    AND i.occurred_at < v_shift.shift_end;

  -- Extract Brain findings (WP3 outputs)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ad.id,
      'resident_id', ad.resident_id,
      'resident_name', r.name,
      'anomaly_type', ad.anomaly_type,
      'severity', ad.severity,
      'confidence', ad.confidence,
      'detected_at', ad.detected_at,
      'explanation', ad.explanation,
      'recommended_action', ad.recommended_action
    ) ORDER BY ad.severity DESC, ad.detected_at DESC
  ) INTO v_brain_findings
  FROM anomaly_detections ad
  LEFT JOIN residents r ON r.id = ad.resident_id
  WHERE ad.agency_id = p_agency_id
    AND ad.detected_at >= v_shift.shift_start
    AND ad.detected_at < v_shift.shift_end;

  -- Get resident summary
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'room_number', r.room_number,
      'care_level', r.care_level,
      'task_count', (SELECT COUNT(*) FROM core_tasks WHERE resident_id = r.id AND scheduled_time >= v_shift.shift_start AND scheduled_time < v_shift.shift_end),
      'completed_task_count', (SELECT COUNT(*) FROM core_tasks WHERE resident_id = r.id AND status = 'completed' AND scheduled_time >= v_shift.shift_start AND scheduled_time < v_shift.shift_end)
    )
  ) INTO v_residents
  FROM residents r
  WHERE r.agency_id = p_agency_id
    AND r.status = 'active';

  -- Calculate data hash for change detection
  v_data_hash := md5(
    COALESCE(v_tasks::text, '') ||
    COALESCE(v_vitals::text, '') ||
    COALESCE(v_medications::text, '') ||
    COALESCE(v_incidents::text, '') ||
    COALESCE(v_brain_findings::text, '')
  );

  RETURN jsonb_build_object(
    'shift_id', p_shift_id,
    'shift_date', v_shift.shift_date,
    'shift_start', v_shift.shift_start,
    'shift_end', v_shift.shift_end,
    'department_id', v_shift.department_id,
    'data_hash', v_data_hash,
    'extracted_at', now(),
    'residents', COALESCE(v_residents, '[]'::jsonb),
    'tasks', COALESCE(v_tasks, '[]'::jsonb),
    'vitals', COALESCE(v_vitals, '[]'::jsonb),
    'medications', COALESCE(v_medications, '[]'::jsonb),
    'incidents', COALESCE(v_incidents, '[]'::jsonb),
    'brain_findings', COALESCE(v_brain_findings, '[]'::jsonb),
    'summary_stats', jsonb_build_object(
      'total_tasks', jsonb_array_length(COALESCE(v_tasks, '[]'::jsonb)),
      'completed_tasks', (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(v_tasks, '[]'::jsonb)) t WHERE t->>'status' = 'completed'),
      'vitals_recorded', jsonb_array_length(COALESCE(v_vitals, '[]'::jsonb)),
      'medications_administered', (SELECT COUNT(*) FROM jsonb_array_elements(COALESCE(v_medications, '[]'::jsonb)) m WHERE m->>'status' = 'administered'),
      'incidents_count', jsonb_array_length(COALESCE(v_incidents, '[]'::jsonb)),
      'brain_findings_count', jsonb_array_length(COALESCE(v_brain_findings, '[]'::jsonb))
    )
  );
END;
$$;

-- Generate Shift Report (Narrative from Facts)
CREATE OR REPLACE FUNCTION generate_shift_report(
  p_agency_id uuid,
  p_shift_id uuid,
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
  v_evidence_links jsonb := '[]'::jsonb;
  v_start_time timestamptz := now();
  v_duration_ms int;
BEGIN
  -- Log generation start
  INSERT INTO report_generation_log (
    agency_id, report_type, generation_trigger, triggered_by, status, processing_started_at
  ) VALUES (
    p_agency_id, 'shift_report', 
    CASE WHEN p_triggered_by IS NULL THEN 'scheduled' ELSE 'manual' END,
    p_triggered_by, 'processing', now()
  )
  RETURNING id INTO v_log_id;

  -- Get active template
  SELECT * INTO v_template
  FROM report_templates
  WHERE report_type = 'shift_report'
    AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  IF v_template.id IS NULL THEN
    UPDATE report_generation_log
    SET status = 'failed', error_message = 'No active template found'
    WHERE id = v_log_id;
    
    RETURN jsonb_build_object('success', false, 'error', 'No active template found');
  END IF;

  -- Extract data
  v_data := compute_shift_report_data(p_agency_id, p_shift_id);

  -- Generate narrative (Heuristic v1 - deterministic)
  v_narrative := jsonb_build_object(
    'title', 'Shift Report - ' || to_char((v_data->>'shift_date')::date, 'Mon DD, YYYY'),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'heading', 'Shift Overview',
        'content', format(
          'Shift covered %s to %s. %s tasks scheduled, %s completed. %s vital signs recorded. %s medications administered.',
          to_char((v_data->>'shift_start')::timestamptz, 'HH24:MI'),
          to_char((v_data->>'shift_end')::timestamptz, 'HH24:MI'),
          v_data->'summary_stats'->>'total_tasks',
          v_data->'summary_stats'->>'completed_tasks',
          v_data->'summary_stats'->>'vitals_recorded',
          v_data->'summary_stats'->>'medications_administered'
        ),
        'type', 'summary'
      ),
      jsonb_build_object(
        'heading', 'Resident Status',
        'content', (
          SELECT string_agg(
            format('%s (Room %s): %s of %s tasks completed',
              res->>'name',
              res->>'room_number',
              res->>'completed_task_count',
              res->>'task_count'
            ),
            E'\n'
          )
          FROM jsonb_array_elements(v_data->'residents') res
        ),
        'type', 'resident_summary'
      ),
      jsonb_build_object(
        'heading', 'Critical Items',
        'content', CASE
          WHEN (v_data->'summary_stats'->>'incidents_count')::int > 0 THEN
            format('%s incident(s) occurred during shift. See details below.', v_data->'summary_stats'->>'incidents_count')
          WHEN (v_data->'summary_stats'->>'brain_findings_count')::int > 0 THEN
            format('%s health concern(s) detected by monitoring system.', v_data->'summary_stats'->>'brain_findings_count')
          ELSE
            'No critical items to report.'
        END,
        'type', 'critical_items'
      ),
      jsonb_build_object(
        'heading', 'Outstanding Tasks',
        'content', (
          SELECT COALESCE(string_agg(
            format('- %s: %s (Resident: %s)',
              t->>'category',
              t->>'title',
              t->>'resident_name'
            ),
            E'\n'
          ), 'All tasks completed.')
          FROM jsonb_array_elements(v_data->'tasks') t
          WHERE t->>'status' != 'completed'
        ),
        'type', 'outstanding_tasks'
      ),
      jsonb_build_object(
        'heading', 'Brain Intelligence Findings',
        'content', CASE
          WHEN jsonb_array_length(v_data->'brain_findings') > 0 THEN
            (
              SELECT string_agg(
                format('- %s: %s (Confidence: %s%%) - %s',
                  bf->>'resident_name',
                  bf->>'anomaly_type',
                  ((bf->>'confidence')::numeric * 100)::int,
                  bf->>'explanation'
                ),
                E'\n'
              )
              FROM jsonb_array_elements(v_data->'brain_findings') bf
            )
          ELSE
            'No anomalies or concerns detected.'
        END,
        'type', 'brain_findings'
      )
    )
  );

  -- Build evidence links
  v_evidence_links := jsonb_build_object(
    'tasks', (SELECT jsonb_agg(t->'id') FROM jsonb_array_elements(v_data->'tasks') t),
    'vitals', (SELECT jsonb_agg(v->'id') FROM jsonb_array_elements(v_data->'vitals') v),
    'medications', (SELECT jsonb_agg(m->'id') FROM jsonb_array_elements(v_data->'medications') m),
    'incidents', (SELECT jsonb_agg(i->'id') FROM jsonb_array_elements(v_data->'incidents') i),
    'brain_findings', (SELECT jsonb_agg(bf->'id') FROM jsonb_array_elements(v_data->'brain_findings') bf)
  );

  -- Create report record
  INSERT INTO generated_reports (
    agency_id, report_type, template_id, template_version,
    report_date, shift_id, department_id,
    report_title, report_content, evidence_links,
    source_data_hash, source_data_snapshot,
    brain_findings, generation_method
  ) VALUES (
    p_agency_id, 'shift_report', v_template.id, v_template.version,
    (v_data->>'shift_date')::date, p_shift_id, (v_data->>'department_id')::uuid,
    v_narrative->>'title', v_narrative, v_evidence_links,
    v_data->>'data_hash', v_data,
    v_data->'brain_findings', 'heuristic_v1'
  )
  RETURNING id INTO v_report_id;

  -- Calculate duration
  v_duration_ms := EXTRACT(EPOCH FROM (now() - v_start_time)) * 1000;

  -- Update log
  UPDATE report_generation_log
  SET report_id = v_report_id,
      status = 'completed',
      data_extracted_count = (v_data->'summary_stats'->>'total_tasks')::int,
      evidence_links_count = jsonb_array_length(v_evidence_links->'tasks') +
                             jsonb_array_length(v_evidence_links->'vitals') +
                             jsonb_array_length(v_evidence_links->'medications'),
      brain_findings_count = (v_data->'summary_stats'->>'brain_findings_count')::int,
      processing_completed_at = now(),
      processing_duration_ms = v_duration_ms
  WHERE id = v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_report_id,
    'report_type', 'shift_report',
    'data_hash', v_data->>'data_hash',
    'processing_duration_ms', v_duration_ms,
    'evidence_links_count', jsonb_array_length(v_evidence_links->'tasks') +
                            jsonb_array_length(v_evidence_links->'vitals') +
                            jsonb_array_length(v_evidence_links->'medications'),
    'message', 'Shift report generated successfully'
  );
END;
$$;
