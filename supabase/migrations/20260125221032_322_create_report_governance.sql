/*
  # WP5: Report Governance - Versioning, Edits, Re-generation

  1. Functions
    - edit_report: Log supervisor edits
    - regenerate_report: Re-compute if data changed
    - detect_report_data_changes: Check if source data changed
    - publish_report: Mark as published

  2. Truth Enforcement
    - All edits logged
    - AI vs human content distinguishable
    - Re-generation only if data changed
*/

-- Edit Report (Supervisor Modification)
CREATE OR REPLACE FUNCTION edit_report(
  p_report_id uuid,
  p_edited_by uuid,
  p_section_edited text,
  p_original_content text,
  p_edited_content text,
  p_edit_reason text DEFAULT NULL,
  p_is_redaction boolean DEFAULT false,
  p_is_correction boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report record;
  v_edit_id uuid;
BEGIN
  -- Get report
  SELECT * INTO v_report
  FROM generated_reports
  WHERE id = p_report_id;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;

  -- Log edit
  INSERT INTO report_edits (
    report_id, agency_id, edited_by,
    section_edited, original_content, edited_content,
    edit_reason, is_redaction, is_correction
  ) VALUES (
    p_report_id, v_report.agency_id, p_edited_by,
    p_section_edited, p_original_content, p_edited_content,
    p_edit_reason, p_is_redaction, p_is_correction
  )
  RETURNING id INTO v_edit_id;

  -- Update report content (apply edit)
  UPDATE generated_reports
  SET report_content = jsonb_set(
        report_content,
        string_to_array(p_section_edited, '.'),
        to_jsonb(p_edited_content)
      ),
      generated_at = now() -- Mark as modified
  WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'success', true,
    'edit_id', v_edit_id,
    'report_id', p_report_id,
    'message', 'Report edited successfully - edit logged'
  );
END;
$$;

-- Detect Report Data Changes
CREATE OR REPLACE FUNCTION detect_report_data_changes(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report record;
  v_new_data jsonb;
  v_new_hash text;
  v_data_changed boolean := false;
BEGIN
  -- Get report
  SELECT * INTO v_report
  FROM generated_reports
  WHERE id = p_report_id;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;

  -- Re-extract data based on report type
  CASE v_report.report_type
    WHEN 'shift_report' THEN
      v_new_data := compute_shift_report_data(v_report.agency_id, v_report.shift_id);
      v_new_hash := v_new_data->>'data_hash';
    
    WHEN 'daily_summary' THEN
      v_new_data := compute_daily_summary_data(v_report.agency_id, v_report.report_date, v_report.department_id);
      v_new_hash := v_new_data->>'data_hash';
    
    ELSE
      -- Incident and family reports typically don't change
      v_new_hash := v_report.source_data_hash;
  END CASE;

  -- Check if hash changed
  v_data_changed := v_new_hash != v_report.source_data_hash;

  RETURN jsonb_build_object(
    'report_id', p_report_id,
    'report_type', v_report.report_type,
    'data_changed', v_data_changed,
    'old_hash', v_report.source_data_hash,
    'new_hash', v_new_hash,
    'new_data', v_new_data
  );
END;
$$;

-- Regenerate Report (If Data Changed)
CREATE OR REPLACE FUNCTION regenerate_report(
  p_report_id uuid,
  p_triggered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report record;
  v_changes jsonb;
  v_new_report_result jsonb;
  v_new_report_id uuid;
BEGIN
  -- Get report
  SELECT * INTO v_report
  FROM generated_reports
  WHERE id = p_report_id;

  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;

  -- Detect changes
  v_changes := detect_report_data_changes(p_report_id);

  -- If no changes, don't regenerate
  IF NOT (v_changes->>'data_changed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'report_id', p_report_id,
      'message', 'No data changes detected - regeneration not required',
      'data_changed', false
    );
  END IF;

  -- Mark current report as superseded
  UPDATE generated_reports
  SET is_superseded = true
  WHERE id = p_report_id;

  -- Generate new report
  CASE v_report.report_type
    WHEN 'shift_report' THEN
      v_new_report_result := generate_shift_report(v_report.agency_id, v_report.shift_id, p_triggered_by);
    
    WHEN 'daily_summary' THEN
      v_new_report_result := generate_daily_summary(v_report.agency_id, v_report.report_date, v_report.department_id, p_triggered_by);
    
    ELSE
      RAISE EXCEPTION 'Regeneration not supported for report type: %', v_report.report_type;
  END CASE;

  v_new_report_id := (v_new_report_result->>'report_id')::uuid;

  -- Link superseded report to new report
  UPDATE generated_reports
  SET superseded_by = v_new_report_id
  WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'success', true,
    'old_report_id', p_report_id,
    'new_report_id', v_new_report_id,
    'data_changed', true,
    'message', 'Report regenerated due to data changes'
  );
END;
$$;

-- Publish Report (Mark as Final)
CREATE OR REPLACE FUNCTION publish_report(
  p_report_id uuid,
  p_published_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE generated_reports
  SET is_published = true,
      published_at = now()
  WHERE id = p_report_id
    AND is_published = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Report not found or already published'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', p_report_id,
    'published_at', now(),
    'message', 'Report published successfully'
  );
END;
$$;

-- Get Report with Edits
CREATE OR REPLACE FUNCTION get_report_with_edits(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report jsonb;
  v_edits jsonb;
BEGIN
  -- Get report
  SELECT to_jsonb(gr.*) INTO v_report
  FROM generated_reports gr
  WHERE id = p_report_id;

  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Report not found: %', p_report_id;
  END IF;

  -- Get edits
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'edited_by', edited_by,
      'edit_timestamp', edit_timestamp,
      'section_edited', section_edited,
      'original_content', original_content,
      'edited_content', edited_content,
      'edit_reason', edit_reason,
      'is_redaction', is_redaction,
      'is_correction', is_correction
    ) ORDER BY edit_timestamp
  ) INTO v_edits
  FROM report_edits
  WHERE report_id = p_report_id;

  RETURN v_report || jsonb_build_object(
    'edits', COALESCE(v_edits, '[]'::jsonb),
    'has_edits', v_edits IS NOT NULL,
    'edit_count', jsonb_array_length(COALESCE(v_edits, '[]'::jsonb))
  );
END;
$$;

-- List Reports
CREATE OR REPLACE FUNCTION list_reports(
  p_agency_id uuid,
  p_report_type text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reports jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gr.id,
      'report_type', gr.report_type,
      'report_title', gr.report_title,
      'report_date', gr.report_date,
      'generated_at', gr.generated_at,
      'is_published', gr.is_published,
      'is_superseded', gr.is_superseded,
      'has_edits', EXISTS(SELECT 1 FROM report_edits WHERE report_id = gr.id),
      'evidence_links_count', (
        SELECT COUNT(*)
        FROM jsonb_each(gr.evidence_links) e
        WHERE jsonb_array_length(e.value::jsonb) > 0
      )
    ) ORDER BY gr.generated_at DESC
  ) INTO v_reports
  FROM generated_reports gr
  WHERE gr.agency_id = p_agency_id
    AND (p_report_type IS NULL OR gr.report_type = p_report_type)
    AND (p_start_date IS NULL OR gr.report_date >= p_start_date)
    AND (p_end_date IS NULL OR gr.report_date <= p_end_date)
    AND gr.is_superseded = false -- Only show current versions
  LIMIT p_limit;

  RETURN COALESCE(v_reports, '[]'::jsonb);
END;
$$;
