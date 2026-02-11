/*
  # WP2: Routine Task Configuration

  1. New Tables
    - `routine_task_types` - Defines task types that support quick-tap completion
    - `task_exception_thresholds` - Defines when a task becomes an "exception"
    - `task_completion_telemetry` - Tracks taps, time, typing for WP2 verification
    - `voice_transcriptions` - Stores voice recordings and transcriptions
    - `structured_voice_extractions` - Parsed structured data from voice
    - `evidence_quality_scores` - Photo/audio quality metrics

  2. Security
    - Enable RLS on all tables
    - Caregivers can create telemetry and voice data
    - Supervisors can view all data
*/

-- Routine task types that support quick-tap
CREATE TABLE IF NOT EXISTS routine_task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_category_id uuid REFERENCES task_categories(id),
  name text NOT NULL,
  description text,
  supports_quick_tap boolean DEFAULT true,
  supports_all_clear boolean DEFAULT true,
  quick_values jsonb, -- [{label, value, icon}]
  default_completion_seconds integer DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- Exception thresholds for deviation detection
CREATE TABLE IF NOT EXISTS task_exception_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_task_type_id uuid REFERENCES routine_task_types(id),
  resident_id uuid REFERENCES residents(id),
  metric_name text NOT NULL,
  baseline_value text,
  baseline_range_min numeric,
  baseline_range_max numeric,
  warning_threshold_min numeric,
  warning_threshold_max numeric,
  critical_threshold_min numeric,
  critical_threshold_max numeric,
  requires_evidence_if_exceeded boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task completion telemetry for WP2 verification
CREATE TABLE IF NOT EXISTS task_completion_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id),
  agency_id uuid REFERENCES agencies(id),
  completion_method text, -- 'quick_tap', 'all_clear', 'voice', 'manual_form', 'exception_form'
  tap_count integer DEFAULT 0,
  character_count integer DEFAULT 0,
  completion_seconds numeric,
  was_exception boolean DEFAULT false,
  exception_reason text,
  voice_used boolean DEFAULT false,
  evidence_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Voice transcriptions
CREATE TABLE IF NOT EXISTS voice_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id),
  user_id uuid REFERENCES user_profiles(id),
  agency_id uuid REFERENCES agencies(id),
  audio_url text,
  audio_duration_seconds numeric,
  transcription_text text,
  transcription_confidence numeric,
  transcription_provider text, -- 'whisper', 'google', 'azure', etc.
  quality_score numeric, -- audio quality 0-100
  created_at timestamptz DEFAULT now(),
  transcribed_at timestamptz
);

-- Structured extractions from voice
CREATE TABLE IF NOT EXISTS structured_voice_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_transcription_id uuid REFERENCES voice_transcriptions(id) ON DELETE CASCADE,
  extraction_type text NOT NULL, -- 'medication', 'vital_signs', 'incident_note', 'adl', 'meal'
  extracted_data jsonb NOT NULL,
  confidence_score numeric,
  requires_correction boolean DEFAULT false,
  corrected_by uuid REFERENCES user_profiles(id),
  corrected_at timestamptz,
  final_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Evidence quality scores
CREATE TABLE IF NOT EXISTS evidence_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_evidence_id uuid REFERENCES task_evidence(id) ON DELETE CASCADE,
  evidence_type text NOT NULL, -- 'photo', 'audio', 'video'
  overall_score numeric NOT NULL, -- 0-100
  blur_score numeric,
  lighting_score numeric,
  composition_score numeric,
  audio_volume_score numeric,
  audio_noise_score numeric,
  quality_issues jsonb, -- [{issue, severity, description}]
  passed_minimum_threshold boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE routine_task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_exception_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completion_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE structured_voice_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_quality_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- routine_task_types: All authenticated users can read
CREATE POLICY "Anyone can view routine task types"
  ON routine_task_types FOR SELECT
  TO authenticated
  USING (true);

-- task_exception_thresholds: Users in same agency can read
CREATE POLICY "Users can view thresholds in their agency"
  ON task_exception_thresholds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM residents r
      WHERE r.id = task_exception_thresholds.resident_id
      AND r.agency_id IN (
        SELECT agency_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- task_completion_telemetry: Users can insert their own, supervisors can view all
CREATE POLICY "Users can create their own telemetry"
  ON task_completion_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view telemetry in their agency"
  ON task_completion_telemetry FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- voice_transcriptions: Users can create and view their own, supervisors can view all
CREATE POLICY "Users can create their own voice transcriptions"
  ON voice_transcriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view voice transcriptions in their agency"
  ON voice_transcriptions FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own voice transcriptions"
  ON voice_transcriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- structured_voice_extractions: Same as voice_transcriptions
CREATE POLICY "Users can create voice extractions"
  ON structured_voice_extractions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM voice_transcriptions vt
      WHERE vt.id = structured_voice_extractions.voice_transcription_id
      AND vt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view voice extractions in their agency"
  ON structured_voice_extractions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM voice_transcriptions vt
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE vt.id = structured_voice_extractions.voice_transcription_id
      AND vt.agency_id = up.agency_id
    )
  );

CREATE POLICY "Users can update their own voice extractions"
  ON structured_voice_extractions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM voice_transcriptions vt
      WHERE vt.id = structured_voice_extractions.voice_transcription_id
      AND vt.user_id = auth.uid()
    )
  );

-- evidence_quality_scores: Anyone can insert, same agency can read
CREATE POLICY "Users can create evidence quality scores"
  ON evidence_quality_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_evidence te
      JOIN tasks t ON t.id = te.task_id
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE te.id = evidence_quality_scores.task_evidence_id
      AND t.agency_id = up.agency_id
    )
  );

CREATE POLICY "Users can view evidence quality scores in their agency"
  ON evidence_quality_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_evidence te
      JOIN tasks t ON t.id = te.task_id
      JOIN user_profiles up ON up.id = auth.uid()
      WHERE te.id = evidence_quality_scores.task_evidence_id
      AND t.agency_id = up.agency_id
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_routine_task_types_category ON routine_task_types(task_category_id);
CREATE INDEX IF NOT EXISTS idx_exception_thresholds_routine_type ON task_exception_thresholds(routine_task_type_id);
CREATE INDEX IF NOT EXISTS idx_exception_thresholds_resident ON task_exception_thresholds(resident_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_task ON task_completion_telemetry(task_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_user ON task_completion_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_agency_created ON task_completion_telemetry(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_task ON voice_transcriptions(task_id);
CREATE INDEX IF NOT EXISTS idx_voice_user ON voice_transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_extraction_transcription ON structured_voice_extractions(voice_transcription_id);
CREATE INDEX IF NOT EXISTS idx_quality_evidence ON evidence_quality_scores(task_evidence_id);
