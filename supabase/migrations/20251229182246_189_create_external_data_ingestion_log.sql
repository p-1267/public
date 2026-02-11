/*
  # External Data Ingestion Log Table (Phase 30)

  ## Purpose
  Immutable audit trail for all external data ingestion events.
  Complete traceability for compliance and security.

  ## New Tables
  - `external_data_ingestion_log`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `integration_id` (uuid, FK to integration_registry) - integration source
    - `provider_name` (text) - provider name
    - `data_type` (text) - type of data ingested
    - `data_domain` (text) - data domain
    - `action` (text) - INGEST, FAIL, BLOCK
    - `action_reason` (text) - reason for action
    - `consent_domain` (text, nullable) - consent domain checked
    - `consent_version` (text, nullable) - consent version at time
    - `credential_id` (uuid, FK to credentials, nullable) - credential used
    - `credential_version` (text, nullable) - credential version/hash
    - `validation_result` (jsonb) - validation results
    - `trust_score` (numeric, nullable) - calculated trust score
    - `ingestion_timestamp` (timestamptz) - when ingestion occurred
    - `source_timestamp` (timestamptz, nullable) - timestamp from source system
    - `resident_id` (uuid, FK to residents, nullable) - related resident
    - `observation_id` (uuid, nullable) - created observation ID
    - `conflict_id` (uuid, nullable) - conflict ID if applicable
    - `request_metadata` (jsonb) - request metadata
    - `created_at` (timestamptz)

  ## Actions
  - INGEST: Data successfully ingested
  - FAIL: Ingestion failed (validation, connection, etc.)
  - BLOCK: Ingestion blocked (consent, credentials, gates)

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. Every integration event MUST log: Integration ID, Provider, Data type, Action, Timestamp, Consent version, Credential version
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS external_data_ingestion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integration_registry(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  data_type text NOT NULL,
  data_domain text NOT NULL,
  action text NOT NULL CHECK (action IN ('INGEST', 'FAIL', 'BLOCK')),
  action_reason text NOT NULL,
  consent_domain text,
  consent_version text,
  credential_id uuid REFERENCES credentials(id) ON DELETE CASCADE,
  credential_version text,
  validation_result jsonb NOT NULL DEFAULT '{}',
  trust_score numeric(5,2),
  ingestion_timestamp timestamptz NOT NULL DEFAULT now(),
  source_timestamp timestamptz,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  observation_id uuid,
  conflict_id uuid,
  request_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE external_data_ingestion_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_external_data_ingestion_log_agency_id ON external_data_ingestion_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_external_data_ingestion_log_integration_id ON external_data_ingestion_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_external_data_ingestion_log_action ON external_data_ingestion_log(action);
CREATE INDEX IF NOT EXISTS idx_external_data_ingestion_log_resident_id ON external_data_ingestion_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_external_data_ingestion_log_ingestion_timestamp ON external_data_ingestion_log(ingestion_timestamp DESC);
