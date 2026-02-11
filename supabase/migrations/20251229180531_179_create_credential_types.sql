/*
  # Credential Types Table (Phase 29)

  ## Purpose
  Defines supported credential types for external integrations.
  Payment processors, AI providers, external data APIs.

  ## New Tables
  - `credential_types`
    - `id` (uuid, primary key)
    - `type_key` (text, unique) - credential type identifier
    - `type_name` (text) - human-readable name
    - `description` (text) - detailed description
    - `category` (text) - PAYMENT_PROCESSOR, AI_PROVIDER, EXTERNAL_API
    - `supports_sandbox` (boolean) - supports sandbox environment
    - `configuration_schema` (jsonb) - required configuration fields
    - `validation_rules` (jsonb) - validation rules
    - `is_active` (boolean) - active status
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Credential Categories
  1. PAYMENT_PROCESSOR - Payment processors (e.g., Stripe)
  2. AI_PROVIDER - AI providers (e.g., OpenAI, Gemini)
  3. EXTERNAL_API - External data APIs (labs, pharmacies, EHRs)

  ## Security
  - RLS enabled
  - No hard-coded secrets

  ## Enforcement Rules
  1. Supported credential types: Payment processors, AI providers, External data APIs
  2. No hard-coded secrets allowed
*/

CREATE TABLE IF NOT EXISTS credential_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key text NOT NULL UNIQUE,
  type_name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('PAYMENT_PROCESSOR', 'AI_PROVIDER', 'EXTERNAL_API')),
  supports_sandbox boolean NOT NULL DEFAULT true,
  configuration_schema jsonb NOT NULL DEFAULT '{}',
  validation_rules jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_credential_types_type_key ON credential_types(type_key);
CREATE INDEX IF NOT EXISTS idx_credential_types_category ON credential_types(category);
CREATE INDEX IF NOT EXISTS idx_credential_types_is_active ON credential_types(is_active);

-- Insert supported credential types
INSERT INTO credential_types (type_key, type_name, description, category, supports_sandbox, configuration_schema) VALUES
('STRIPE', 'Stripe Payment Processor', 'Stripe payment processing integration for billing and payments', 'PAYMENT_PROCESSOR', true, '{"api_key": "required", "webhook_secret": "required", "account_id": "optional"}'),
('OPENAI', 'OpenAI API', 'OpenAI API integration for AI-powered suggestions and summarization', 'AI_PROVIDER', false, '{"api_key": "required", "organization_id": "optional"}'),
('GEMINI', 'Google Gemini API', 'Google Gemini API integration for AI-powered assistance', 'AI_PROVIDER', false, '{"api_key": "required", "project_id": "optional"}'),
('EHR_API', 'Electronic Health Records API', 'Integration with external EHR systems', 'EXTERNAL_API', true, '{"api_key": "required", "endpoint_url": "required", "client_id": "optional"}'),
('PHARMACY_API', 'Pharmacy API', 'Integration with pharmacy systems for medication management', 'EXTERNAL_API', true, '{"api_key": "required", "endpoint_url": "required"}'),
('LAB_API', 'Laboratory API', 'Integration with laboratory systems for test results', 'EXTERNAL_API', true, '{"api_key": "required", "endpoint_url": "required"}')
ON CONFLICT (type_key) DO NOTHING;
