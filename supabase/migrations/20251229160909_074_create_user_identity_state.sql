/*
  # User Identity State FSM (Phase 19)

  ## Purpose
  Tracks the explicit identity lifecycle state for every user in the system.
  Enforces finite state machine transitions for identity management.

  ## Identity States
  - INVITED: User has been invited but not yet verified
  - VERIFIED: User has verified contact method but not accepted terms
  - ACTIVE: User is fully active with granted access
  - SUSPENDED: Temporarily blocked, reversible
  - REVOKED: Permanently removed, irreversible
  - ARCHIVED: Historical record, no access

  ## New Tables
  - `user_identity_state`
    - `user_id` (uuid, primary key, FK to user_profiles)
    - `current_state` (text) - one of the 6 states above
    - `previous_state` (text, nullable) - last state before transition
    - `state_version` (integer) - monotonic counter for state transitions
    - `suspended_reason` (text, nullable) - reason for suspension
    - `revoked_reason` (text, nullable) - reason for revocation
    - `revoked_by` (uuid, nullable, FK to user_profiles) - who revoked access
    - `state_changed_at` (timestamptz) - when state last changed
    - `created_at` (timestamptz) - record creation
    - `updated_at` (timestamptz) - last update

  ## Security
  - RLS enabled
  - Only authorized users can modify states
  - All transitions are logged in audit_log

  ## Enforcement Rules
  1. State transitions must be linear (no skipping)
  2. REVOKED state is terminal (cannot transition out)
  3. ARCHIVED state is terminal (cannot transition out)
  4. All state changes must be audited
*/

CREATE TABLE IF NOT EXISTS user_identity_state (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  current_state text NOT NULL CHECK (current_state IN ('INVITED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ARCHIVED')),
  previous_state text CHECK (previous_state IN ('INVITED', 'VERIFIED', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ARCHIVED')),
  state_version integer NOT NULL DEFAULT 1,
  suspended_reason text,
  revoked_reason text,
  revoked_by uuid REFERENCES user_profiles(id),
  state_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_identity_state ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_identity_state_current_state ON user_identity_state(current_state);
CREATE INDEX IF NOT EXISTS idx_user_identity_state_revoked_by ON user_identity_state(revoked_by);
CREATE INDEX IF NOT EXISTS idx_user_identity_state_state_changed_at ON user_identity_state(state_changed_at);
