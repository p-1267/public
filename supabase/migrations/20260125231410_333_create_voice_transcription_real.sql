/*
  # WP8: Voice Transcription (REAL ASYNC JOB LIFECYCLE)
  
  NO FAKE TRANSCRIPTS ALLOWED.
  Must be: Audio → External Provider → Real Transcript
  
  1. Voice transcription jobs
    - Submitted to external provider (OpenAI Whisper / Google / etc.)
    - Tracks job ID from provider
    - Polls for completion
    - Stores provider-originated transcript
  
  2. Audio evidence
    - Links to storage (Supabase Storage)
    - Original file metadata
  
  3. Confidence scores
    - Provider confidence stored
    - Quality metrics
*/

-- Voice transcription jobs (REAL provider jobs)
CREATE TABLE IF NOT EXISTS voice_transcription_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  audio_storage_path text NOT NULL, -- Supabase Storage path
  audio_filename text NOT NULL,
  audio_duration_seconds numeric,
  audio_size_bytes bigint,
  provider_id uuid REFERENCES integration_providers(id) ON DELETE SET NULL,
  provider_job_id text, -- External provider's job ID
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'processing', 'completed', 'failed'
  transcript_text text, -- MUST be from provider, not fake
  confidence_score numeric, -- Provider's confidence (0.0 - 1.0)
  language_detected text,
  error_message text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  -- Link to care activity
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  resident_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX idx_voice_jobs_agency ON voice_transcription_jobs(agency_id, created_at DESC);
CREATE INDEX idx_voice_jobs_status ON voice_transcription_jobs(status, submitted_at DESC);
CREATE INDEX idx_voice_jobs_provider ON voice_transcription_jobs(provider_id);
CREATE INDEX idx_voice_jobs_task ON voice_transcription_jobs(task_id);

-- RLS policies for voice jobs
ALTER TABLE voice_transcription_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency's voice jobs"
  ON voice_transcription_jobs FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create voice jobs"
  ON voice_transcription_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can update voice jobs"
  ON voice_transcription_jobs FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );
