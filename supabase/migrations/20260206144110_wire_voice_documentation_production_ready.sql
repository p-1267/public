/*
  # Wire Voice Documentation to Production Backend

  1. Purpose
    - Grant RPC permissions for voice transcription
    - Add simulated transcription for showcase mode
    - Save transcripts to task evidence and audit log

  2. Changes
    - Grant execute permissions
    - Add showcase-compatible transcription handler
    - Wire to care logs
*/

-- Grant permissions to voice transcription RPCs
GRANT EXECUTE ON FUNCTION submit_voice_transcription(uuid, text, text, numeric, bigint, uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION poll_voice_transcription(uuid) TO authenticated, anon;

-- Add anon policies for voice transcription jobs (showcase mode)
CREATE POLICY "Anon can view voice jobs in showcase"
  ON voice_transcription_jobs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can create voice jobs in showcase"
  ON voice_transcription_jobs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update voice jobs in showcase"
  ON voice_transcription_jobs FOR UPDATE
  TO anon
  USING (true);

-- Function to simulate transcription completion (for showcase mode)
CREATE OR REPLACE FUNCTION complete_voice_transcription_showcase(
  p_job_id uuid,
  p_transcript text,
  p_language text DEFAULT 'en',
  p_confidence numeric DEFAULT 0.95
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update job with simulated results
  UPDATE voice_transcription_jobs
  SET
    status = 'completed',
    transcript_text = p_transcript,
    confidence_score = p_confidence,
    language_detected = p_language,
    completed_at = now()
  WHERE id = p_job_id;

  -- If linked to task, save as evidence
  INSERT INTO task_evidence (
    task_id,
    captured_by,
    evidence_type,
    transcription,
    captured_at
  )
  SELECT
    task_id,
    created_by,
    'audio',
    p_transcript,
    now()
  FROM voice_transcription_jobs
  WHERE id = p_job_id AND task_id IS NOT NULL;

  -- If linked to resident, write audit log
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    metadata,
    created_at
  )
  SELECT
    'voice_documentation.recorded',
    created_by,
    'resident',
    resident_id,
    jsonb_build_object(
      'job_id', p_job_id,
      'transcript_preview', LEFT(p_transcript, 100),
      'language', p_language,
      'confidence', p_confidence
    ),
    now()
  FROM voice_transcription_jobs
  WHERE id = p_job_id AND resident_id IS NOT NULL;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'status', 'completed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_voice_transcription_showcase(uuid, text, text, numeric) TO authenticated, anon;

-- Helper function to save voice transcript to care log
CREATE OR REPLACE FUNCTION save_voice_to_care_log(
  p_job_id uuid,
  p_task_id uuid,
  p_resident_id uuid,
  p_transcript text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_evidence_id uuid;
BEGIN
  -- Save as task evidence
  INSERT INTO task_evidence (
    task_id,
    captured_by,
    evidence_type,
    transcription,
    notes,
    captured_at
  ) VALUES (
    p_task_id,
    auth.uid(),
    'audio',
    p_transcript,
    'Voice documentation',
    now()
  )
  RETURNING id INTO v_evidence_id;

  -- Write audit log
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    metadata,
    created_at
  ) VALUES (
    'care_documentation.voice_recorded',
    auth.uid(),
    'resident',
    p_resident_id,
    jsonb_build_object(
      'task_id', p_task_id,
      'job_id', p_job_id,
      'evidence_id', v_evidence_id,
      'transcript_length', LENGTH(p_transcript)
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'evidence_id', v_evidence_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION save_voice_to_care_log(uuid, uuid, uuid, text) TO authenticated, anon;
