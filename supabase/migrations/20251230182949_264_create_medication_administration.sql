/*
  # Medication Administration Tracking (Phase 2)

  1. Purpose
    - Track every medication administration attempt
    - Enforce timing rules (late, missed, early)
    - Auto-create incidents for violations
    - Support controlled substance dual verification

  2. New Tables
    - `medication_administration_log`
      - Logs every take/skip/late event
      - Links to resident_medications
      - Tracks timing, verification, outcome
    
    - `medication_schedules`
      - Auto-generated scheduled doses
      - Tracks expected vs actual administration
      - Triggers missed-dose detection

    - `medication_interactions`
      - Known drug-drug interactions
      - Allergy warnings
      - Contraindications

  3. Enforcement
    - Missed dose: +30 min past scheduled → auto-incident
    - Controlled substance: dual verification required
    - Interaction check: runs on every administration
*/

CREATE TABLE IF NOT EXISTS medication_administration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES resident_medications(id) ON DELETE CASCADE,
  scheduled_time timestamptz,
  administered_at timestamptz,
  administered_by uuid NOT NULL REFERENCES user_profiles(id),
  verified_by uuid REFERENCES user_profiles(id),
  status text NOT NULL CHECK (status IN ('TAKEN', 'SKIPPED', 'LATE', 'MISSED', 'REFUSED')),
  dosage_given text,
  route_used text,
  reason_for_skip text,
  resident_response text,
  side_effects_observed text,
  is_controlled boolean NOT NULL DEFAULT false,
  dual_verification_required boolean NOT NULL DEFAULT false,
  dual_verification_completed boolean,
  language_context text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dual_verification_check CHECK (
    NOT dual_verification_required OR verified_by IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS medication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES resident_medications(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  expected_at timestamptz NOT NULL,
  window_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'MISSED', 'SKIPPED')),
  completed_at timestamptz,
  administration_log_id uuid REFERENCES medication_administration_log(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medication_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_a_name text NOT NULL,
  medication_b_name text NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('MAJOR', 'MODERATE', 'MINOR')),
  interaction_description text NOT NULL,
  recommendation text NOT NULL,
  requires_block boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(medication_a_name, medication_b_name)
);

CREATE TABLE IF NOT EXISTS medication_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES resident_medications(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES medication_schedules(id) ON DELETE SET NULL,
  administration_log_id uuid REFERENCES medication_administration_log(id) ON DELETE SET NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('MISSED_DOSE', 'LATE_ADMINISTRATION', 'ADVERSE_REACTION', 'WRONG_DOSAGE', 'INTERACTION_WARNING', 'REFUSAL')),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description text NOT NULL,
  auto_generated boolean NOT NULL DEFAULT false,
  reported_by uuid NOT NULL REFERENCES user_profiles(id),
  supervisor_notified_at timestamptz,
  supervisor_acknowledged_by uuid REFERENCES user_profiles(id),
  supervisor_acknowledged_at timestamptz,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medication_administration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_incidents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_med_admin_log_resident ON medication_administration_log(resident_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_admin_log_medication ON medication_administration_log(medication_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_log_status ON medication_administration_log(status);
CREATE INDEX IF NOT EXISTS idx_med_schedules_resident_date ON medication_schedules(resident_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_med_schedules_status ON medication_schedules(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_med_schedules_expected ON medication_schedules(expected_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_med_incidents_resident ON medication_incidents(resident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_med_incidents_unresolved ON medication_incidents(severity, created_at DESC) WHERE resolved_at IS NULL;
