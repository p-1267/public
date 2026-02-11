/*
  # Integration Conflicts Table (Phase 30)

  ## Purpose
  Tracks conflicts between external data and internal records.
  Preserves both records, surfaces to supervisor, no auto-resolve.

  ## New Tables
  - `integration_conflicts`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `integration_id` (uuid, FK to integration_registry) - source integration
    - `resident_id` (uuid, FK to residents) - related resident
    - `observation_id` (uuid, FK to external_observations) - external observation
    - `conflict_type` (text) - DATA_MISMATCH, TIMESTAMP_CONFLICT, VALUE_DISCREPANCY, DUPLICATE_RECORD
    - `conflict_severity` (text) - LOW, MEDIUM, HIGH, CRITICAL
    - `external_value` (jsonb) - external data value
    - `internal_value` (jsonb, nullable) - internal data value
    - `conflict_details` (jsonb) - detailed conflict information
    - `detected_at` (timestamptz) - when conflict detected
    - `resolution_status` (text) - PENDING, UNDER_REVIEW, RESOLVED, DISMISSED
    - `assigned_to` (uuid, FK to user_profiles, nullable) - assigned supervisor
    - `reviewed_by` (uuid, FK to user_profiles, nullable) - who reviewed
    - `reviewed_at` (timestamptz, nullable) - when reviewed
    - `resolution_action` (text, nullable) - resolution action taken
    - `resolution_notes` (text, nullable) - resolution notes
    - `resolved_at` (timestamptz, nullable) - when resolved
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Conflict Types
  1. DATA_MISMATCH - Data values don't match
  2. TIMESTAMP_CONFLICT - Timestamp discrepancy
  3. VALUE_DISCREPANCY - Significant value difference
  4. DUPLICATE_RECORD - Duplicate data detected

  ## Conflict Severity
  1. LOW - Minor discrepancy
  2. MEDIUM - Notable difference
  3. HIGH - Significant conflict
  4. CRITICAL - Critical discrepancy requiring immediate attention

  ## Resolution Status
  1. PENDING - Awaiting review
  2. UNDER_REVIEW - Being reviewed
  3. RESOLVED - Conflict resolved
  4. DISMISSED - Conflict dismissed

  ## Security
  - RLS enabled
  - Per-agency and per-resident isolation

  ## Enforcement Rules
  1. If external data conflicts with internal records: Flag discrepancy, Surface to supervisor, Preserve both records, Do NOT auto-resolve
*/

CREATE TABLE IF NOT EXISTS integration_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integration_registry(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  observation_id uuid REFERENCES external_observations(id) ON DELETE CASCADE,
  conflict_type text NOT NULL CHECK (conflict_type IN ('DATA_MISMATCH', 'TIMESTAMP_CONFLICT', 'VALUE_DISCREPANCY', 'DUPLICATE_RECORD')),
  conflict_severity text NOT NULL CHECK (conflict_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  external_value jsonb NOT NULL,
  internal_value jsonb,
  conflict_details jsonb NOT NULL DEFAULT '{}',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolution_status text NOT NULL DEFAULT 'PENDING' CHECK (resolution_status IN ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  reviewed_at timestamptz,
  resolution_action text,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE integration_conflicts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_integration_conflicts_agency_id ON integration_conflicts(agency_id);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_integration_id ON integration_conflicts(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_resident_id ON integration_conflicts(resident_id);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_observation_id ON integration_conflicts(observation_id);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_conflict_severity ON integration_conflicts(conflict_severity);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_resolution_status ON integration_conflicts(resolution_status);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_detected_at ON integration_conflicts(detected_at DESC);
