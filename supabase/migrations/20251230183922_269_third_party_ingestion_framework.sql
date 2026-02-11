/*
  # Third-Party Data Ingestion Framework (Phase 3)

  1. Purpose
    - Control all external data entry
    - Assign trust scores to sources
    - Deterministic conflict resolution
    - Full audit trace

  2. New Tables
    - `external_data_sources`
      - Register external systems
      - Trust scores
    
    - `external_data_ingestion_queue`
      - Queue for incoming data
      - Pre-validation checks
    
    - `external_data_conflicts`
      - Track conflicts requiring resolution

  3. Enforcement
    - No direct writes to core tables from external sources
    - All data flows through Brain pipeline
    - Conflicts require manual resolution
*/

CREATE TABLE IF NOT EXISTS external_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL UNIQUE,
  source_type text NOT NULL CHECK (source_type IN ('EHR', 'PHARMACY', 'LAB', 'DEVICE', 'API', 'MANUAL')),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  trust_score numeric(3,2) NOT NULL DEFAULT 0.5 CHECK (trust_score BETWEEN 0 AND 1),
  is_active boolean NOT NULL DEFAULT true,
  api_endpoint text,
  last_sync_at timestamptz,
  sync_frequency_minutes integer,
  conflict_resolution_strategy text NOT NULL DEFAULT 'MANUAL' CHECK (conflict_resolution_strategy IN ('MANUAL', 'TRUST_HIGHEST', 'NEWEST_WINS', 'OLDEST_WINS')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_data_ingestion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES external_data_sources(id) ON DELETE CASCADE,
  data_type text NOT NULL CHECK (data_type IN ('MEDICATION', 'VITAL', 'LAB_RESULT', 'APPOINTMENT', 'DIAGNOSIS', 'ALLERGY')),
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  raw_data jsonb NOT NULL,
  normalized_data jsonb,
  validation_status text NOT NULL DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED', 'CONFLICTED')),
  validation_errors jsonb,
  processed_at timestamptz,
  ingested_by uuid REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_data_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingestion_id uuid NOT NULL REFERENCES external_data_ingestion_queue(id) ON DELETE CASCADE,
  conflict_type text NOT NULL CHECK (conflict_type IN ('DUPLICATE', 'CONTRADICTION', 'OUTDATED', 'MISSING_REQUIRED')),
  existing_record_table text NOT NULL,
  existing_record_id uuid,
  conflict_description text NOT NULL,
  resolution_strategy text,
  resolved_by uuid REFERENCES user_profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE external_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_data_ingestion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_data_conflicts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_external_sources_agency ON external_data_sources(agency_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_source ON external_data_ingestion_queue(source_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_status ON external_data_ingestion_queue(validation_status);
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_resident ON external_data_ingestion_queue(resident_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_ingestion ON external_data_conflicts(ingestion_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_unresolved ON external_data_conflicts(resolved_at) WHERE resolved_at IS NULL;

CREATE POLICY "Agency users can view their sources"
  ON external_data_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.agency_id = external_data_sources.agency_id
    )
  );

CREATE POLICY "Agency admins can manage sources"
  ON external_data_sources FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND up.agency_id = external_data_sources.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can view ingestion queue"
  ON external_data_ingestion_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN external_data_sources eds ON eds.id = external_data_ingestion_queue.source_id
      WHERE up.id = auth.uid()
        AND up.agency_id = eds.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can view conflicts"
  ON external_data_conflicts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN external_data_ingestion_queue ediq ON ediq.id = external_data_conflicts.ingestion_id
      JOIN external_data_sources eds ON eds.id = ediq.source_id
      WHERE up.id = auth.uid()
        AND up.agency_id = eds.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can resolve conflicts"
  ON external_data_conflicts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN external_data_ingestion_queue ediq ON ediq.id = external_data_conflicts.ingestion_id
      JOIN external_data_sources eds ON eds.id = ediq.source_id
      WHERE up.id = auth.uid()
        AND up.agency_id = eds.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );
