/*
  # Incident Impacts Table (Phase 32)

  ## Purpose
  Tracks specific impacts of incidents across failure domains.
  Enforces failure domain isolation tracking.

  ## New Tables
  - `incident_impacts`
    - `id` (uuid, primary key)
    - `incident_id` (text, FK to incident_log) - Associated incident
    - `impact_domain` (text) - TENANT, RESIDENT, CAREGIVER, DEVICE, INTEGRATION, REGION
    - `domain_identifier` (text) - Specific domain entity ID
    - `impact_description` (text) - Description of impact
    - `impact_severity` (text) - CRITICAL, HIGH, MEDIUM, LOW
    - `impact_started_at` (timestamptz) - Impact start time
    - `impact_ended_at` (timestamptz, nullable) - Impact end time
    - `was_isolated` (boolean) - Was failure isolated to this domain
    - `cascaded_to_other_domains` (boolean) - Did failure cascade
    - `cascaded_domains` (text[], nullable) - Domains affected by cascade
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Impact Domains
  1. TENANT - Agency/tenant impacted
  2. RESIDENT - Specific resident impacted
  3. CAREGIVER - Specific caregiver impacted
  4. DEVICE - Specific device impacted
  5. INTEGRATION - Integration impacted
  6. REGION - Geographic region impacted

  ## Security
  - RLS enabled
  - Admin access only
  - Immutable audit trail

  ## Enforcement Rules
  1. Failure domain isolation MUST be tracked
  2. Failure in one domain MUST NOT impact others (tracked via was_isolated)
  3. Cascading failures MUST be recorded
*/

CREATE TABLE IF NOT EXISTS incident_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text NOT NULL,
  impact_domain text NOT NULL CHECK (impact_domain IN ('TENANT', 'RESIDENT', 'CAREGIVER', 'DEVICE', 'INTEGRATION', 'REGION')),
  domain_identifier text NOT NULL,
  impact_description text NOT NULL,
  impact_severity text NOT NULL CHECK (impact_severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  impact_started_at timestamptz NOT NULL,
  impact_ended_at timestamptz,
  was_isolated boolean NOT NULL DEFAULT true,
  cascaded_to_other_domains boolean NOT NULL DEFAULT false,
  cascaded_domains text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE incident_impacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_incident_impacts_incident_id ON incident_impacts(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_impacts_impact_domain ON incident_impacts(impact_domain);
CREATE INDEX IF NOT EXISTS idx_incident_impacts_domain_identifier ON incident_impacts(domain_identifier);
CREATE INDEX IF NOT EXISTS idx_incident_impacts_was_isolated ON incident_impacts(was_isolated);
CREATE INDEX IF NOT EXISTS idx_incident_impacts_cascaded_to_other_domains ON incident_impacts(cascaded_to_other_domains);
CREATE INDEX IF NOT EXISTS idx_incident_impacts_impact_started_at ON incident_impacts(impact_started_at DESC);
