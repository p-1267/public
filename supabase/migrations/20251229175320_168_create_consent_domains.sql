/*
  # Consent Domains Table (Phase 28)

  ## Purpose
  Defines consent domains that require explicit permission.
  NO bundled consent allowed.

  ## New Tables
  - `consent_domains`
    - `id` (uuid, primary key)
    - `domain_key` (text, unique) - domain identifier
    - `domain_name` (text) - human-readable name
    - `description` (text) - detailed description
    - `legal_basis` (text) - legal basis for processing
    - `data_scope` (jsonb) - what data is affected
    - `processing_purpose` (text) - why data is processed
    - `retention_period` (text) - how long data is retained
    - `is_required` (boolean) - required for service
    - `display_order` (integer) - display order
    - `is_active` (boolean) - active status
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Consent Domains (MANDATORY)
  1. DATA_STORAGE_PROCESSING - Data storage & processing
  2. AI_ASSISTANCE_OBSERVATION - AI assistance & observation
  3. VOICE_RECORDING - Voice recording
  4. PHOTO_VIDEO_CAPTURE - Photo / video capture
  5. BIOMETRIC_DATA - Biometric data
  6. THIRD_PARTY_SHARING - Third-party data sharing
  7. EMERGENCY_OVERRIDE - Emergency override permissions

  ## Security
  - RLS enabled
  - Agency-isolated

  ## Enforcement Rules
  1. No bundled consent allowed
  2. Each domain requires explicit consent
*/

CREATE TABLE IF NOT EXISTS consent_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_key text NOT NULL UNIQUE,
  domain_name text NOT NULL,
  description text NOT NULL,
  legal_basis text NOT NULL,
  data_scope jsonb NOT NULL DEFAULT '{}',
  processing_purpose text NOT NULL,
  retention_period text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consent_domains ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_consent_domains_domain_key ON consent_domains(domain_key);
CREATE INDEX IF NOT EXISTS idx_consent_domains_is_active ON consent_domains(is_active);
CREATE INDEX IF NOT EXISTS idx_consent_domains_display_order ON consent_domains(display_order);

-- Insert mandatory consent domains
INSERT INTO consent_domains (domain_key, domain_name, description, legal_basis, data_scope, processing_purpose, retention_period, is_required, display_order) VALUES
('DATA_STORAGE_PROCESSING', 'Data Storage & Processing', 'Storage and processing of personal and health information in our secure systems', 'Legitimate Interest', '{"personal_info": true, "health_data": true, "care_records": true}', 'To provide care management services', 'Retained per legal requirements', true, 1),
('AI_ASSISTANCE_OBSERVATION', 'AI Assistance & Observation', 'AI-powered assistance and observation of workflow patterns to improve care quality', 'Consent', '{"workflow_patterns": true, "user_actions": true, "system_interactions": true}', 'To provide AI-powered guidance and suggestions', 'Retained for AI model training and improvement', false, 2),
('VOICE_RECORDING', 'Voice Recording', 'Recording of voice interactions for documentation and quality assurance', 'Consent', '{"voice_data": true, "audio_recordings": true}', 'To document care interactions and ensure quality', 'Retained per legal requirements', false, 3),
('PHOTO_VIDEO_CAPTURE', 'Photo / Video Capture', 'Capture of photos and videos for documentation and care purposes', 'Consent', '{"photos": true, "videos": true, "visual_records": true}', 'To document care activities and resident status', 'Retained per legal requirements', false, 4),
('BIOMETRIC_DATA', 'Biometric Data', 'Collection and processing of biometric data (fingerprints, facial recognition)', 'Consent', '{"fingerprints": true, "facial_recognition": true, "biometric_identifiers": true}', 'To verify identity and ensure security', 'Retained per legal requirements', false, 5),
('THIRD_PARTY_SHARING', 'Third-Party Data Sharing', 'Sharing of data with authorized third parties (insurance, healthcare providers)', 'Consent', '{"insurance_data": true, "healthcare_records": true, "billing_information": true}', 'To coordinate care and process billing', 'Retained per legal requirements', false, 6),
('EMERGENCY_OVERRIDE', 'Emergency Override Permissions', 'Permission to override privacy controls in life-threatening emergencies', 'Vital Interest', '{"full_data_access": true, "emergency_contacts": true, "medical_history": true}', 'To provide emergency care when life is at risk', 'Retained per legal requirements', true, 7)
ON CONFLICT (domain_key) DO NOTHING;
