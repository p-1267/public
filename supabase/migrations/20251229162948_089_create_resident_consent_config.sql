/*
  # Resident Consent Configuration Table (Phase 20)

  ## Purpose
  Stores consent and visibility configuration for residents.
  All consent decisions are logged and versioned.
  Revocation triggers immediate Brain recalculation.

  ## New Tables
  - `resident_consent_config`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents) - one config per resident
    - `consent_version` (integer) - version number for audit trail
    - `family_visibility_level` (text) - FULL, SUMMARY, EMERGENCY_ONLY, NONE
    - `ai_assistance_level` (text) - FULL, MODERATE, MINIMAL, NONE
    - `data_sharing_scope` (text) - AGENCY_ONLY, HEALTHCARE_PARTNERS, EMERGENCY_SERVICES, RESEARCH_DEIDENTIFIED
    - `emergency_override_permissions` (jsonb) - who can override in emergency
    - `photo_consent` (boolean) - consent for photos
    - `voice_recording_consent` (boolean) - consent for voice recording
    - `biometric_consent` (boolean) - consent for biometric data
    - `third_party_sharing_consent` (boolean) - consent for third-party sharing
    - `consent_obtained_by` (uuid, FK to user_profiles) - who obtained consent
    - `consent_obtained_from` (text) - resident or legal representative
    - `legal_representative_name` (text, nullable) - if applicable
    - `legal_representative_relationship` (text, nullable) - relationship
    - `is_active` (boolean) - whether this is the active consent config
    - `revoked_at` (timestamptz, nullable) - when consent was revoked
    - `revoked_by` (uuid, nullable, FK to user_profiles) - who revoked
    - `language_context` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - All consent changes are audited
  - Revocation triggers immediate effect

  ## Enforcement Rules
  1. Only one active consent config per resident
  2. Consent revocation triggers Brain recalculation
  3. Care execution adapts without interruption
  4. All changes are versioned
*/

CREATE TABLE IF NOT EXISTS resident_consent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  consent_version integer NOT NULL DEFAULT 1,
  family_visibility_level text NOT NULL CHECK (family_visibility_level IN ('FULL', 'SUMMARY', 'EMERGENCY_ONLY', 'NONE')),
  ai_assistance_level text NOT NULL CHECK (ai_assistance_level IN ('FULL', 'MODERATE', 'MINIMAL', 'NONE')),
  data_sharing_scope text NOT NULL CHECK (data_sharing_scope IN ('AGENCY_ONLY', 'HEALTHCARE_PARTNERS', 'EMERGENCY_SERVICES', 'RESEARCH_DEIDENTIFIED')),
  emergency_override_permissions jsonb NOT NULL DEFAULT '{}',
  photo_consent boolean NOT NULL DEFAULT false,
  voice_recording_consent boolean NOT NULL DEFAULT false,
  biometric_consent boolean NOT NULL DEFAULT false,
  third_party_sharing_consent boolean NOT NULL DEFAULT false,
  consent_obtained_by uuid NOT NULL REFERENCES user_profiles(id),
  consent_obtained_from text NOT NULL,
  legal_representative_name text,
  legal_representative_relationship text,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES user_profiles(id),
  language_context text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resident_id, consent_version)
);

ALTER TABLE resident_consent_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_consent_config_resident_id ON resident_consent_config(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_consent_config_is_active ON resident_consent_config(resident_id, is_active);
