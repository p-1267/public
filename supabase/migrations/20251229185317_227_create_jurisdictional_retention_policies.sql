/*
  # Jurisdictional Retention Policies Table (Phase 33)

  ## Purpose
  Defines retention policies based on jurisdiction (country, state/province, care context).
  Retention rules MUST be configurable but locked per jurisdiction.

  ## New Tables
  - `jurisdictional_retention_policies`
    - `id` (uuid, primary key)
    - `policy_id` (text) - Unique policy identifier
    - `jurisdiction_country` (text) - Country code (ISO 3166-1 alpha-2)
    - `jurisdiction_state` (text, nullable) - State/province code
    - `care_context` (text) - ASSISTED_LIVING, NURSING_HOME, HOME_CARE, HOSPICE
    - `data_category` (text) - MEDICAL_RECORD, CARE_LOG, ATTENDANCE_RECORD, FINANCIAL_RECORD, COMMUNICATION_RECORD, AUDIT_RECORD, SYSTEM_LOG
    - `retention_years` (integer) - Retention period in years
    - `retention_days` (integer) - Computed retention in days
    - `archival_allowed` (boolean) - Is archival allowed after retention
    - `erasure_allowed` (boolean) - Is erasure allowed after retention
    - `legal_basis` (text) - Legal basis for retention (statute, regulation, etc.)
    - `legal_citation` (text) - Legal citation reference
    - `is_locked` (boolean) - Is policy locked (cannot be modified)
    - `locked_by` (uuid, FK to user_profiles, nullable) - Who locked
    - `locked_at` (timestamptz, nullable) - When locked
    - `created_by` (uuid, FK to user_profiles) - Who created
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Data Categories
  1. MEDICAL_RECORD - Medical records
  2. CARE_LOG - Care logs
  3. ATTENDANCE_RECORD - Attendance records
  4. FINANCIAL_RECORD - Financial records
  5. COMMUNICATION_RECORD - Communication records
  6. AUDIT_RECORD - Audit records (never erased)
  7. SYSTEM_LOG - System logs

  ## Care Context
  1. ASSISTED_LIVING - Assisted living facility
  2. NURSING_HOME - Nursing home
  3. HOME_CARE - Home care
  4. HOSPICE - Hospice care

  ## Security
  - RLS enabled
  - SUPER_ADMIN management only
  - Policies can be locked

  ## Enforcement Rules
  1. Retention rules MUST be configurable but locked per jurisdiction
  2. Data retention is jurisdiction-driven
  3. If the law requires retention, data stays
  4. Retention behavior is category-specific
*/

CREATE TABLE IF NOT EXISTS jurisdictional_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id text NOT NULL UNIQUE,
  jurisdiction_country text NOT NULL,
  jurisdiction_state text,
  care_context text NOT NULL CHECK (care_context IN ('ASSISTED_LIVING', 'NURSING_HOME', 'HOME_CARE', 'HOSPICE')),
  data_category text NOT NULL CHECK (data_category IN ('MEDICAL_RECORD', 'CARE_LOG', 'ATTENDANCE_RECORD', 'FINANCIAL_RECORD', 'COMMUNICATION_RECORD', 'AUDIT_RECORD', 'SYSTEM_LOG')),
  retention_years integer NOT NULL CHECK (retention_years >= 0),
  retention_days integer NOT NULL GENERATED ALWAYS AS (retention_years * 365) STORED,
  archival_allowed boolean NOT NULL DEFAULT true,
  erasure_allowed boolean NOT NULL DEFAULT false,
  legal_basis text NOT NULL,
  legal_citation text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  locked_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  locked_at timestamptz,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(jurisdiction_country, jurisdiction_state, care_context, data_category)
);

ALTER TABLE jurisdictional_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_jurisdictional_retention_policies_policy_id ON jurisdictional_retention_policies(policy_id);
CREATE INDEX IF NOT EXISTS idx_jurisdictional_retention_policies_jurisdiction_country ON jurisdictional_retention_policies(jurisdiction_country);
CREATE INDEX IF NOT EXISTS idx_jurisdictional_retention_policies_care_context ON jurisdictional_retention_policies(care_context);
CREATE INDEX IF NOT EXISTS idx_jurisdictional_retention_policies_data_category ON jurisdictional_retention_policies(data_category);
CREATE INDEX IF NOT EXISTS idx_jurisdictional_retention_policies_is_locked ON jurisdictional_retention_policies(is_locked);
