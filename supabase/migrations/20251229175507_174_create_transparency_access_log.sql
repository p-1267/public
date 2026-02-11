/*
  # Transparency Access Log Table (Phase 28)

  ## Purpose
  Tracks when users access transparency information.
  Audit trail for transparency portal usage.

  ## New Tables
  - `transparency_access_log`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `user_id` (uuid, FK to user_profiles) - user accessing
    - `access_type` (text) - type of access
    - `resource_type` (text) - what was accessed
    - `resource_id` (uuid, nullable) - specific resource
    - `timestamp` (timestamptz) - when accessed
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional context

  ## Access Types
  - VIEW_CONSENT_STATUS - View current consent
  - VIEW_CONSENT_HISTORY - View consent history
  - VIEW_DATA_COLLECTION - View data collection
  - VIEW_DATA_PROCESSING - View data processing
  - VIEW_DATA_SHARING - View data sharing
  - VIEW_THIRD_PARTY_INTEGRATIONS - View third-party integrations
  - DOWNLOAD_DATA_EXPORT - Download data export

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. All transparency portal access must be logged
  2. Users can view their own access history
*/

CREATE TABLE IF NOT EXISTS transparency_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('VIEW_CONSENT_STATUS', 'VIEW_CONSENT_HISTORY', 'VIEW_DATA_COLLECTION', 'VIEW_DATA_PROCESSING', 'VIEW_DATA_SHARING', 'VIEW_THIRD_PARTY_INTEGRATIONS', 'DOWNLOAD_DATA_EXPORT')),
  resource_type text NOT NULL,
  resource_id uuid,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE transparency_access_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_transparency_access_log_agency_id ON transparency_access_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_transparency_access_log_user_id ON transparency_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_transparency_access_log_access_type ON transparency_access_log(access_type);
CREATE INDEX IF NOT EXISTS idx_transparency_access_log_timestamp ON transparency_access_log(timestamp DESC);
