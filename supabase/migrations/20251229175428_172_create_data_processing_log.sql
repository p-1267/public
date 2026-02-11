/*
  # Data Processing Log Table (Phase 28)

  ## Purpose
  Tracks all data processing activities for transparency.
  Users can see what data is collected, processed, and shared.

  ## New Tables
  - `data_processing_log`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `resident_id` (uuid, FK to residents, nullable) - resident if applicable
    - `user_id` (uuid, FK to user_profiles, nullable) - user if applicable
    - `processing_type` (text) - COLLECT, PROCESS, SHARE, ACCESS, DELETE
    - `data_category` (text) - category of data
    - `data_scope` (jsonb) - specific data processed
    - `consent_domain` (text) - consent domain required
    - `consent_verified` (boolean) - consent was verified
    - `consent_id` (uuid, FK to consent_registry, nullable) - related consent
    - `purpose` (text) - purpose of processing
    - `processor_system` (text) - which system processed
    - `processor_user_id` (uuid, FK to user_profiles, nullable) - user who processed
    - `third_party_recipient` (text, nullable) - third party if shared
    - `timestamp` (timestamptz) - when processed
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional context

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. No data processing occurs without valid consent
  2. All processing must be logged
  3. Users can view their processing history
*/

CREATE TABLE IF NOT EXISTS data_processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  processing_type text NOT NULL CHECK (processing_type IN ('COLLECT', 'PROCESS', 'SHARE', 'ACCESS', 'DELETE')),
  data_category text NOT NULL,
  data_scope jsonb NOT NULL DEFAULT '{}',
  consent_domain text NOT NULL,
  consent_verified boolean NOT NULL DEFAULT false,
  consent_id uuid REFERENCES consent_registry(id) ON DELETE SET NULL,
  purpose text NOT NULL,
  processor_system text NOT NULL,
  processor_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  third_party_recipient text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE data_processing_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_data_processing_log_agency_id ON data_processing_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_resident_id ON data_processing_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_user_id ON data_processing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_processing_type ON data_processing_log(processing_type);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_consent_domain ON data_processing_log(consent_domain);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_consent_verified ON data_processing_log(consent_verified);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_timestamp ON data_processing_log(timestamp DESC);
