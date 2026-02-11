/*
  # Create Residents Table

  ## Purpose
  Stores care recipients (seniors) managed by agencies.
  Residents are the subject of care plans and caregiver assignments.

  ## New Tables
  - `residents`
    - `id` (uuid, primary key) - unique resident identifier
    - `agency_id` (uuid, not null, FK) - owning agency
    - `full_name` (text, not null) - resident legal name
    - `date_of_birth` (date, not null) - for age calculation
    - `status` (text, not null, default 'active') - active, discharged, deceased
    - `metadata` (jsonb, default '{}') - care plan details, medical info, etc.
    - `created_at` (timestamptz, default now()) - registration timestamp
    - `created_by` (uuid, references user_profiles) - user who registered resident
    - `updated_at` (timestamptz, default now()) - last update timestamp

  ## Security
  - RLS enabled (restrictive by default)
  - Agency-scoped access only
  - NO deletion allowed (archive via status instead)
  - Full audit logging

  ## Important Notes
  1. Residents are never deleted (set status to 'discharged' or 'deceased')
  2. PII is stored; ensure compliance with data protection laws
  3. Metadata allows flexible care plan storage
  4. Registration is auditable
*/

CREATE TABLE IF NOT EXISTS residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discharged', 'deceased')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_residents_agency_id ON residents(agency_id);
CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_created_by ON residents(created_by);
CREATE INDEX IF NOT EXISTS idx_residents_created_at ON residents(created_at);

-- Audit trigger
CREATE TRIGGER audit_residents_changes
  AFTER INSERT OR UPDATE OR DELETE ON residents
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_role_change();
