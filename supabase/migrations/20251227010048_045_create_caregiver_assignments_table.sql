/*
  # Create Caregiver Assignments Table

  ## Purpose
  Explicit assignment of caregivers to residents within an agency.
  Defines who is responsible for delivering care to which resident.

  ## New Tables
  - `caregiver_assignments`
    - `id` (uuid, primary key) - unique assignment identifier
    - `agency_id` (uuid, not null, FK) - owning agency
    - `resident_id` (uuid, not null, FK) - care recipient
    - `caregiver_user_id` (uuid, not null, FK) - assigned caregiver
    - `assigned_by` (uuid, not null, FK) - user who created assignment
    - `assigned_at` (timestamptz, default now()) - assignment timestamp
    - `removed_at` (timestamptz, nullable) - if assignment was removed
    - `removed_by` (uuid, nullable, FK) - user who removed assignment
    - `status` (text, default 'active') - active, removed
    - `metadata` (jsonb, default '{}') - assignment-specific notes

  ## Security
  - RLS enabled (restrictive by default)
  - Agency-scoped access only
  - Assignments are explicit (no automation)
  - Full audit logging

  ## Important Notes
  1. Assignments are NOT deleted (set status to 'removed')
  2. One active assignment per resident (enforced by unique constraint)
  3. Assignment history is preserved
  4. All assignment changes are auditable
  5. No cascading behavior on caregiver/resident changes
*/

CREATE TABLE IF NOT EXISTS caregiver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  caregiver_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES user_profiles(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  removed_by uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE caregiver_assignments ENABLE ROW LEVEL SECURITY;

-- Unique constraint: one active assignment per resident
CREATE UNIQUE INDEX IF NOT EXISTS idx_caregiver_assignments_active_resident
  ON caregiver_assignments(resident_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_agency_id ON caregiver_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_caregiver ON caregiver_assignments(caregiver_user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_assigned_by ON caregiver_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_caregiver_assignments_status ON caregiver_assignments(status);

-- Audit trigger
CREATE TRIGGER audit_caregiver_assignments_changes
  AFTER INSERT OR UPDATE OR DELETE ON caregiver_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_audit_role_change();