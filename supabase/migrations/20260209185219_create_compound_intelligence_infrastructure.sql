/*
  # Compound Intelligence Infrastructure

  1. Tables
    - correlation_rules: Explicit deterministic rules
    - compound_intelligence_events: Multi-signal correlation outputs
    - signal_contributions: Links signals to compound events

  2. Security
    - RLS on all tables
    - Family: read-only, plain language
    - Caregiver: context only
    - Supervisor: actionable

  3. Features
    - Deterministic rule-based correlation
    - Full explainability
    - Evidence linking
*/

-- ============================================================
-- Table: correlation_rules
-- ============================================================

CREATE TABLE IF NOT EXISTS correlation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL UNIQUE,
  rule_description text NOT NULL,
  correlation_type text NOT NULL,
  required_signal_types text[] NOT NULL,
  time_window_hours integer NOT NULL,
  minimum_signals_count integer DEFAULT 2,
  severity_output text NOT NULL CHECK (severity_output IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  rule_logic jsonb NOT NULL,
  is_active boolean DEFAULT true,
  requires_human_action boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correlation_rules_active ON correlation_rules(is_active) WHERE is_active = true;

-- Seed correlation rules
INSERT INTO correlation_rules (
  rule_name,
  rule_description,
  correlation_type,
  required_signal_types,
  time_window_hours,
  minimum_signals_count,
  severity_output,
  rule_logic,
  requires_human_action
) VALUES
(
  'medication_adherence_vitals_pattern',
  'Late/missed medications combined with rising blood pressure or heart rate',
  'MEDICATION_STABILITY_RISK',
  ARRAY['medication_admin', 'vital_sign'],
  168,
  3,
  'HIGH',
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object('signal_type', 'medication_admin', 'status', 'LATE', 'count_min', 2),
      jsonb_build_object('signal_type', 'vital_sign', 'metric', 'blood_pressure_systolic', 'trend', 'RISING')
    )
  ),
  true
),
(
  'family_concern_caregiver_observation',
  'Family observation matches caregiver task outcome concern',
  'CROSS_OBSERVER_VALIDATION',
  ARRAY['family_observation', 'task_completion'],
  48,
  2,
  'MODERATE',
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object('signal_type', 'family_observation', 'concern_level', 'MODERATE'),
      jsonb_build_object('signal_type', 'task_completion', 'outcome', 'CONCERN')
    )
  ),
  true
),
(
  'device_vitals_activity_decline',
  'Device shows declining activity with abnormal vitals',
  'ACTIVITY_HEALTH_CORRELATION',
  ARRAY['vital_sign', 'care_activity'],
  72,
  3,
  'MODERATE',
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object('signal_type', 'vital_sign', 'abnormal', true),
      jsonb_build_object('signal_type', 'care_activity', 'trend', 'DECLINING')
    )
  ),
  false
),
(
  'multi_domain_instability',
  'Simultaneous issues across medications, vitals, and observations',
  'MULTI_DOMAIN_INSTABILITY',
  ARRAY['medication_admin', 'vital_sign', 'family_observation'],
  96,
  3,
  'CRITICAL',
  jsonb_build_object(
    'conditions', jsonb_build_array(
      jsonb_build_object('signal_type', 'medication_admin', 'compliance_rate', 'BELOW_80'),
      jsonb_build_object('signal_type', 'vital_sign', 'out_of_range', true),
      jsonb_build_object('signal_type', 'family_observation', 'concern_level', 'URGENT')
    )
  ),
  true
)
ON CONFLICT (rule_name) DO NOTHING;

ALTER TABLE correlation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view rules"
  ON correlation_rules FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================
-- Table: compound_intelligence_events
-- ============================================================

CREATE TABLE IF NOT EXISTS compound_intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  correlation_type text NOT NULL,
  correlation_rule_id uuid REFERENCES correlation_rules(id),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  confidence_score numeric(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning_text text NOT NULL,
  reasoning_details jsonb NOT NULL,
  time_window_start timestamptz NOT NULL,
  time_window_end timestamptz NOT NULL,
  contributing_signals_count integer NOT NULL,
  requires_human_action boolean DEFAULT false,
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz,
  supervisor_action text,
  supervisor_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compound_intel_resident ON compound_intelligence_events(resident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compound_intel_agency ON compound_intelligence_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_compound_intel_severity ON compound_intelligence_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compound_intel_unreviewed ON compound_intelligence_events(reviewed_at) WHERE reviewed_at IS NULL AND requires_human_action = true;

ALTER TABLE compound_intelligence_events ENABLE ROW LEVEL SECURITY;

-- Family can view (read-only)
CREATE POLICY "Family can view compound intelligence for linked residents"
  ON compound_intelligence_events FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM family_resident_links
      WHERE family_resident_links.resident_id = compound_intelligence_events.resident_id
        AND family_resident_links.family_user_id = auth.uid()
        AND family_resident_links.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM senior_resident_links
      WHERE senior_resident_links.resident_id = compound_intelligence_events.resident_id
        AND senior_resident_links.senior_user_id = auth.uid()
        AND senior_resident_links.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('CAREGIVER', 'SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = compound_intelligence_events.agency_id
    )
  );

-- Supervisors can review
CREATE POLICY "Supervisors can review compound intelligence"
  ON compound_intelligence_events FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = compound_intelligence_events.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = compound_intelligence_events.agency_id
    )
  );

-- ============================================================
-- Table: signal_contributions
-- ============================================================

CREATE TABLE IF NOT EXISTS signal_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compound_event_id uuid NOT NULL REFERENCES compound_intelligence_events(id) ON DELETE CASCADE,
  signal_source_table text NOT NULL,
  signal_source_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_timestamp timestamptz NOT NULL,
  signal_data jsonb NOT NULL,
  contribution_weight numeric(3,2) DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_contrib_compound ON signal_contributions(compound_event_id);
CREATE INDEX IF NOT EXISTS idx_signal_contrib_source ON signal_contributions(signal_source_table, signal_source_id);

ALTER TABLE signal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View signal contributions with compound event"
  ON signal_contributions FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM compound_intelligence_events cie
      WHERE cie.id = signal_contributions.compound_event_id
    )
  );
