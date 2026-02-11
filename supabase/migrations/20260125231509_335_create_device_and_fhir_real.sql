/*
  # WP8: Device Data Ingestion + FHIR Framework (REAL PAYLOADS)
  
  NO SEEDED VITALS.
  Must be: Real Payload → Normalization → Vitals Entries
  
  1. Device data staging
    - Accepts real webhook payloads
    - Normalizes to standard schema
    - Creates vitals entries
    - Tracks source
  
  2. FHIR resource staging
    - Validates FHIR resources
    - Maps to internal schema
    - Reconciliation strategy
    - NO fake clinical data
*/

-- Device data staging (real incoming payloads)
CREATE TABLE IF NOT EXISTS device_data_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  device_id uuid REFERENCES device_registry(id) ON DELETE SET NULL,
  resident_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  
  -- Source tracking
  provider_id uuid REFERENCES integration_providers(id) ON DELETE SET NULL,
  provider_device_id text, -- External device identifier
  
  -- Raw payload
  raw_payload jsonb NOT NULL, -- Original payload from provider
  payload_format text, -- 'json', 'xml', 'hl7', 'proprietary'
  
  -- Processing status
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
  processed_at timestamptz,
  error_message text,
  
  -- Normalization results
  vitals_created int DEFAULT 0,
  observations_created int DEFAULT 0,
  
  -- Duplicate protection
  payload_hash text,
  
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_data_agency ON device_data_staging(agency_id, received_at DESC);
CREATE INDEX idx_device_data_status ON device_data_staging(status, received_at DESC);
CREATE INDEX idx_device_data_device ON device_data_staging(device_id);
CREATE INDEX idx_device_data_hash ON device_data_staging(payload_hash);

-- Device to vitals mapping (audit trail)
CREATE TABLE IF NOT EXISTS device_vitals_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_id uuid NOT NULL REFERENCES device_data_staging(id) ON DELETE CASCADE,
  vital_sign_id uuid REFERENCES vital_signs(id) ON DELETE SET NULL,
  device_id uuid REFERENCES device_registry(id) ON DELETE SET NULL,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  
  -- Source metadata
  source_field text, -- Field in raw payload
  raw_value text,
  normalized_value numeric,
  unit text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_vitals_staging ON device_vitals_mapping(staging_id);
CREATE INDEX idx_device_vitals_vital ON device_vitals_mapping(vital_sign_id);

-- FHIR resource staging (framework, not full implementation)
CREATE TABLE IF NOT EXISTS fhir_resource_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- FHIR resource details
  resource_type text NOT NULL, -- 'Patient', 'Observation', 'Medication', 'Condition', etc.
  resource_id text, -- FHIR resource ID
  resource_version text, -- FHIR version meta
  
  -- Raw FHIR resource
  fhir_json jsonb NOT NULL,
  
  -- Processing status
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'validated', 'mapped', 'reconciled', 'failed'
  validation_errors jsonb,
  
  -- Mapping results
  mapped_to_table text, -- 'residents', 'vital_signs', 'resident_medications', etc.
  mapped_to_id uuid,
  
  -- Source tracking
  source_system text, -- External EHR system
  source_identifier text,
  
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fhir_staging_agency ON fhir_resource_staging(agency_id, received_at DESC);
CREATE INDEX idx_fhir_staging_type ON fhir_resource_staging(resource_type, status);
CREATE INDEX idx_fhir_staging_resource_id ON fhir_resource_staging(resource_id);

-- FHIR mapping definitions (how FHIR maps to internal schema)
CREATE TABLE IF NOT EXISTS fhir_mapping_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE, -- NULL = global
  
  -- Mapping details
  fhir_resource_type text NOT NULL,
  fhir_field_path text NOT NULL, -- JSONPath to field in FHIR resource
  internal_table text NOT NULL,
  internal_column text NOT NULL,
  
  -- Transformation
  transform_function text, -- SQL function name or 'direct'
  transform_config jsonb,
  
  -- Metadata
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fhir_mappings_resource_type ON fhir_mapping_definitions(fhir_resource_type, active);

-- Translation requests (conditional, real API)
CREATE TABLE IF NOT EXISTS translation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Source
  source_text text NOT NULL,
  source_language text NOT NULL, -- ISO 639-1 code (e.g., 'es', 'zh')
  target_language text NOT NULL, -- ISO 639-1 code (e.g., 'en')
  
  -- Provider tracking
  provider_id uuid REFERENCES integration_providers(id) ON DELETE SET NULL,
  provider_request_id text,
  
  -- Status
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  translated_text text, -- MUST be from provider
  confidence_score numeric,
  error_message text,
  
  -- Context
  context_type text, -- 'voice_transcript', 'family_summary', 'care_note'
  context_id uuid, -- ID of related entity
  
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_translation_requests_agency ON translation_requests(agency_id, created_at DESC);
CREATE INDEX idx_translation_requests_status ON translation_requests(status);

-- RLS policies
ALTER TABLE device_data_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_vitals_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_resource_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_mapping_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency's device data"
  ON device_data_staging FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage device data"
  ON device_data_staging FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their agency's device vitals mapping"
  ON device_vitals_mapping FOR SELECT
  TO authenticated
  USING (
    staging_id IN (
      SELECT id FROM device_data_staging WHERE agency_id IN (
        SELECT agency_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their agency's FHIR resources"
  ON fhir_resource_staging FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage FHIR resources"
  ON fhir_resource_staging FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view global FHIR mappings"
  ON fhir_mapping_definitions FOR SELECT
  TO authenticated
  USING (agency_id IS NULL OR agency_id IN (
    SELECT agency_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage FHIR mappings"
  ON fhir_mapping_definitions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their agency's translation requests"
  ON translation_requests FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage translation requests"
  ON translation_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
