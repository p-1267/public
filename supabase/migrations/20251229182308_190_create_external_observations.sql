/*
  # External Observations Table (Phase 30)

  ## Purpose
  Stores validated external data as observations.
  NEVER overwrites internal records, NEVER auto-triggers actions.

  ## New Tables
  - `external_observations`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `integration_id` (uuid, FK to integration_registry) - source integration
    - `resident_id` (uuid, FK to residents) - related resident
    - `observation_type` (text) - MEDICATION, LAB_RESULT, VITAL_SIGN, CLINICAL_NOTE, WEARABLE_DATA
    - `data_domain` (text) - data domain
    - `observation_data` (jsonb) - validated observation data
    - `source_timestamp` (timestamptz) - timestamp from source system
    - `ingestion_timestamp` (timestamptz) - when ingested
    - `trust_score` (numeric) - calculated trust score
    - `validation_status` (text) - VALIDATED, PENDING_REVIEW, FLAGGED
    - `reviewed_by` (uuid, FK to user_profiles, nullable) - who reviewed
    - `reviewed_at` (timestamptz, nullable) - when reviewed
    - `review_notes` (text, nullable) - review notes
    - `conflict_detected` (boolean) - conflict with internal data
    - `conflict_id` (uuid, nullable) - related conflict ID
    - `auto_action_blocked` (boolean) - was auto action blocked
    - `requires_human_confirmation` (boolean) - requires human review
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Observation Types
  1. MEDICATION - Medication data from pharmacy
  2. LAB_RESULT - Lab results from laboratory
  3. VITAL_SIGN - Vital signs from wearables/monitors
  4. CLINICAL_NOTE - Clinical notes from EHR
  5. WEARABLE_DATA - Data from wearable devices

  ## Validation Status
  1. VALIDATED - Data validated and accepted
  2. PENDING_REVIEW - Requires human review
  3. FLAGGED - Flagged for attention

  ## Security
  - RLS enabled
  - Per-agency and per-resident isolation
  - External observations only, never overwrite internal records

  ## Enforcement Rules
  1. All third-party data enters through the Brain ingestion pipeline
  2. Third-party data MUST be stored as external observations
  3. NEVER overwrite internal records
  4. NEVER auto-trigger actions
  5. NEVER escalate emergencies directly
  6. Any action requires Brain validation + human confirmation
*/

CREATE TABLE IF NOT EXISTS external_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integration_registry(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  observation_type text NOT NULL CHECK (observation_type IN ('MEDICATION', 'LAB_RESULT', 'VITAL_SIGN', 'CLINICAL_NOTE', 'WEARABLE_DATA')),
  data_domain text NOT NULL,
  observation_data jsonb NOT NULL,
  source_timestamp timestamptz NOT NULL,
  ingestion_timestamp timestamptz NOT NULL DEFAULT now(),
  trust_score numeric(5,2) NOT NULL,
  validation_status text NOT NULL DEFAULT 'VALIDATED' CHECK (validation_status IN ('VALIDATED', 'PENDING_REVIEW', 'FLAGGED')),
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  reviewed_at timestamptz,
  review_notes text,
  conflict_detected boolean NOT NULL DEFAULT false,
  conflict_id uuid,
  auto_action_blocked boolean NOT NULL DEFAULT true,
  requires_human_confirmation boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE external_observations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_external_observations_agency_id ON external_observations(agency_id);
CREATE INDEX IF NOT EXISTS idx_external_observations_integration_id ON external_observations(integration_id);
CREATE INDEX IF NOT EXISTS idx_external_observations_resident_id ON external_observations(resident_id);
CREATE INDEX IF NOT EXISTS idx_external_observations_observation_type ON external_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_external_observations_validation_status ON external_observations(validation_status);
CREATE INDEX IF NOT EXISTS idx_external_observations_conflict_detected ON external_observations(conflict_detected);
CREATE INDEX IF NOT EXISTS idx_external_observations_source_timestamp ON external_observations(source_timestamp DESC);
