/*
  # Create Agencies Table

  ## Purpose
  Agency-level administrative entity for multi-tenant care coordination.
  Each agency manages users, residents, and caregiver assignments.

  ## New Tables
  - `agencies`
    - `id` (uuid, primary key) - unique agency identifier
    - `name` (text, unique, not null) - agency legal name
    - `status` (text, not null, default 'active') - active, suspended, archived
    - `metadata` (jsonb, default '{}') - flexible storage for agency config
    - `created_at` (timestamptz, default now()) - creation timestamp
    - `created_by` (uuid, references user_profiles) - user who created agency
    - `updated_at` (timestamptz, default now()) - last update timestamp

  ## Security
  - RLS enabled (restrictive by default)
  - Only AGENCY_ADMIN and SUPER_ADMIN can manage agencies
  - Audit logging enabled via trigger

  ## Important Notes
  1. Agency deletion is NOT supported (archive instead via status)
  2. Name must be unique across all agencies
  3. Metadata field allows extension without schema changes
  4. All actions are auditable
*/

CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(status);
CREATE INDEX IF NOT EXISTS idx_agencies_created_by ON agencies(created_by);
CREATE INDEX IF NOT EXISTS idx_agencies_created_at ON agencies(created_at);

-- Audit trigger
CREATE TRIGGER audit_agencies_changes
  AFTER INSERT OR UPDATE OR DELETE ON agencies
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_role_change();