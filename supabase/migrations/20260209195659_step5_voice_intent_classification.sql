/*
  # STEP 5: Voice → Intent Classification (AGENT LAYER)

  Intent classification layer for voice commands.
  Rule-based, deterministic, auditable.

  1. Intent types
    - DOCUMENTATION: Care log entries
    - REQUEST: Supply/maintenance requests
    - URGENT_ACTION: Incidents/emergencies
    - SCHEDULING: Appointments/activities
    - MEDICATION_ADMINISTRATION: Med logging

  2. Tables
    - voice_intents: Classification results
    - voice_intent_rules: Rule definitions for matching

  3. Extracted entities
    - resident_name, medication_name, dose, route, etc.
    - Stored as jsonb for flexibility
*/

-- Intent classification results
CREATE TABLE IF NOT EXISTS voice_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_job_id uuid NOT NULL REFERENCES voice_transcription_jobs(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- Classification
  intent_type text NOT NULL CHECK (intent_type IN (
    'DOCUMENTATION',
    'REQUEST',
    'URGENT_ACTION',
    'SCHEDULING',
    'MEDICATION_ADMINISTRATION'
  )),
  confidence_score numeric NOT NULL DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1.0),

  -- Extracted entities (medication_name, dose, route, resident_name, etc.)
  extracted_entities jsonb DEFAULT '{}',

  -- Rules that matched
  matched_rules text[], -- Array of rule IDs that matched

  -- Status
  classification_status text NOT NULL DEFAULT 'pending' CHECK (classification_status IN (
    'pending',
    'classified',
    'ambiguous',
    'insufficient_data',
    'error'
  )),

  -- Metadata
  raw_transcript text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  classified_at timestamptz DEFAULT now(),
  classified_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_intents_job ON voice_intents(voice_job_id);
CREATE INDEX idx_voice_intents_agency ON voice_intents(agency_id, created_at DESC);
CREATE INDEX idx_voice_intents_type ON voice_intents(intent_type, created_at DESC);
CREATE INDEX idx_voice_intents_status ON voice_intents(classification_status);

-- RLS policies
ALTER TABLE voice_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency's voice intents"
  ON voice_intents FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Anon can view voice intents in showcase"
  ON voice_intents FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can create voice intents"
  ON voice_intents FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update voice intents"
  ON voice_intents FOR UPDATE
  TO authenticated, anon
  USING (true);

-- Intent classification rules (keyword-based, deterministic)
CREATE TABLE IF NOT EXISTS voice_intent_rules (
  id text PRIMARY KEY,
  intent_type text NOT NULL,
  keywords text[] NOT NULL, -- Keywords that trigger this rule
  priority integer NOT NULL DEFAULT 1, -- Higher priority = checked first
  requires_entities text[], -- Required entities for this rule
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed classification rules
INSERT INTO voice_intent_rules (id, intent_type, keywords, priority, requires_entities, description) VALUES
  -- MEDICATION_ADMINISTRATION (highest priority)
  ('med_give', 'MEDICATION_ADMINISTRATION', ARRAY['give', 'medication', 'med', 'dose', 'insulin', 'pill', 'administer'], 10, ARRAY['medication_name']::text[], 'Give medication now'),
  ('med_took', 'MEDICATION_ADMINISTRATION', ARRAY['took', 'taken', 'swallowed', 'medication'], 10, ARRAY['medication_name']::text[], 'Patient took medication'),
  ('med_refused', 'MEDICATION_ADMINISTRATION', ARRAY['refused', 'declined', 'medication'], 10, ARRAY['medication_name']::text[], 'Patient refused medication'),

  -- URGENT_ACTION (high priority)
  ('urgent_fall', 'URGENT_ACTION', ARRAY['fall', 'fell', 'fallen', 'emergency', 'urgent', 'help'], 9, ARRAY['resident_name']::text[], 'Fall or emergency'),
  ('urgent_pain', 'URGENT_ACTION', ARRAY['pain', 'hurts', 'hurting', 'emergency'], 9, ARRAY['resident_name']::text[], 'Pain complaint'),
  ('urgent_distress', 'URGENT_ACTION', ARRAY['distress', 'breathing', 'chest pain', 'emergency'], 9, ARRAY['resident_name']::text[], 'Medical distress'),

  -- REQUEST (medium priority)
  ('request_supply', 'REQUEST', ARRAY['need', 'request', 'order', 'supply', 'supplies'], 5, ARRAY[]::text[], 'Supply request'),
  ('request_maintenance', 'REQUEST', ARRAY['broken', 'fix', 'repair', 'maintenance'], 5, ARRAY[]::text[], 'Maintenance request'),
  ('request_transport', 'REQUEST', ARRAY['transport', 'transfer', 'move', 'wheelchair'], 5, ARRAY[]::text[], 'Transport request'),

  -- SCHEDULING (medium priority)
  ('schedule_appointment', 'SCHEDULING', ARRAY['schedule', 'appointment', 'doctor', 'visit'], 5, ARRAY['date_time']::text[], 'Schedule appointment'),
  ('schedule_activity', 'SCHEDULING', ARRAY['schedule', 'activity', 'therapy', 'group'], 5, ARRAY['date_time']::text[], 'Schedule activity'),

  -- DOCUMENTATION (lowest priority, catch-all)
  ('doc_vitals', 'DOCUMENTATION', ARRAY['vital', 'vitals', 'blood pressure', 'temperature', 'pulse'], 1, ARRAY['resident_name']::text[], 'Vital signs documentation'),
  ('doc_meal', 'DOCUMENTATION', ARRAY['ate', 'meal', 'breakfast', 'lunch', 'dinner', 'food'], 1, ARRAY['resident_name']::text[], 'Meal documentation'),
  ('doc_adl', 'DOCUMENTATION', ARRAY['bathed', 'dressed', 'toileted', 'shower', 'hygiene'], 1, ARRAY['resident_name']::text[], 'ADL documentation'),
  ('doc_behavior', 'DOCUMENTATION', ARRAY['behavior', 'mood', 'anxious', 'calm', 'agitated'], 1, ARRAY['resident_name']::text[], 'Behavior documentation'),
  ('doc_general', 'DOCUMENTATION', ARRAY['note', 'document', 'log', 'record'], 1, ARRAY[]::text[], 'General documentation')
ON CONFLICT (id) DO UPDATE SET
  keywords = EXCLUDED.keywords,
  priority = EXCLUDED.priority,
  description = EXCLUDED.description;

-- Intent classification function (rule-based, deterministic)
CREATE OR REPLACE FUNCTION classify_voice_intent(
  p_voice_job_id uuid,
  p_agency_id uuid,
  p_transcript text,
  p_language text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent_id uuid;
  v_intent_type text;
  v_matched_rules text[] := '{}';
  v_entities jsonb := '{}';
  v_classification_status text := 'classified';
  v_confidence numeric := 1.0;
  v_transcript_lower text;
  v_rule record;
  v_highest_priority integer := -1;
BEGIN
  v_transcript_lower := LOWER(p_transcript);

  -- Match against rules (highest priority first)
  FOR v_rule IN
    SELECT * FROM voice_intent_rules
    WHERE active = true
    ORDER BY priority DESC
  LOOP
    -- Check if any keywords match
    IF EXISTS (
      SELECT 1 FROM unnest(v_rule.keywords) AS keyword
      WHERE v_transcript_lower LIKE '%' || keyword || '%'
    ) THEN
      -- First match wins (highest priority)
      IF v_highest_priority = -1 THEN
        v_intent_type := v_rule.intent_type;
        v_highest_priority := v_rule.priority;
      END IF;

      v_matched_rules := array_append(v_matched_rules, v_rule.id);
    END IF;
  END LOOP;

  -- If no rules matched, mark as insufficient_data
  IF v_intent_type IS NULL THEN
    v_intent_type := 'DOCUMENTATION'; -- Default fallback
    v_classification_status := 'insufficient_data';
    v_confidence := 0.5;
  END IF;

  -- Extract entities based on intent type
  -- (Simple extraction - in production would use NER)
  v_entities := jsonb_build_object(
    'raw_transcript', p_transcript,
    'detected_keywords', v_matched_rules
  );

  -- Create intent record
  INSERT INTO voice_intents (
    voice_job_id,
    agency_id,
    intent_type,
    confidence_score,
    extracted_entities,
    matched_rules,
    classification_status,
    raw_transcript,
    language,
    classified_at
  ) VALUES (
    p_voice_job_id,
    p_agency_id,
    v_intent_type,
    v_confidence,
    v_entities,
    v_matched_rules,
    v_classification_status,
    p_transcript,
    p_language,
    now()
  )
  RETURNING id INTO v_intent_id;

  RETURN jsonb_build_object(
    'success', true,
    'intent_id', v_intent_id,
    'intent_type', v_intent_type,
    'confidence', v_confidence,
    'status', v_classification_status,
    'matched_rules', v_matched_rules,
    'entities', v_entities
  );
END;
$$;

GRANT EXECUTE ON FUNCTION classify_voice_intent(uuid, uuid, text, text) TO authenticated, anon;
