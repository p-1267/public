/*
  # Seed Supervisor Escalations for Showcase

  ## Changes
  - Add escalation_queue entries to seed_active_context
  - Create 3 sample escalations (CRITICAL, HIGH, MEDIUM) for supervisor demo
  - Each has proper resident link, timing, and clinical context

  ## Purpose
  - Ensure supervisor dashboard shows actionable triage items
  - Demonstrate escalation workflow and clinician notification
*/

CREATE OR REPLACE FUNCTION seed_supervisor_escalations(
  p_agency_id uuid,
  p_resident_id uuid,
  p_resident_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_escalation_id1 uuid;
  v_escalation_id2 uuid;
  v_escalation_id3 uuid;
BEGIN
  -- Clear existing escalations for this resident to make seeding idempotent
  DELETE FROM escalation_queue WHERE resident_id = p_resident_id;

  -- CRITICAL: Fall with possible injury - requires immediate physician notification
  INSERT INTO escalation_queue (
    id,
    agency_id,
    resident_id,
    resident_name,
    escalation_type,
    escalation_level,
    priority,
    title,
    description,
    recommended_action,
    clinical_context,
    escalated_at,
    required_response_by,
    sla_hours,
    status
  ) VALUES (
    gen_random_uuid(),
    p_agency_id,
    p_resident_id,
    p_resident_name,
    'PHYSICIAN_NOTIFICATION',
    2,
    'CRITICAL',
    'Resident Fall - Head Impact Reported',
    'Resident fell in bathroom at 14:35. Caregiver reports brief disorientation. Small abrasion on forehead. Resident now alert but complaining of headache.',
    'Immediate physician assessment required for possible head injury. Monitor vital signs q15min. Consider ER transfer if LOC changes.',
    'History: AFib on warfarin, fall risk score 8/10. Last BP 145/88, HR 92 irregular. Family prefers in-facility assessment if stable.',
    now() - interval '45 minutes',
    now() + interval '1 hour 15 minutes',
    2,
    'PENDING'
  ) RETURNING id INTO v_escalation_id1;

  -- HIGH: Blood sugar out of range - needs care plan adjustment
  INSERT INTO escalation_queue (
    id,
    agency_id,
    resident_id,
    resident_name,
    escalation_type,
    escalation_level,
    priority,
    title,
    description,
    recommended_action,
    clinical_context,
    escalated_at,
    required_response_by,
    sla_hours,
    status
  ) VALUES (
    gen_random_uuid(),
    p_agency_id,
    p_resident_id,
    p_resident_name,
    'CLINICAL_REVIEW',
    1,
    'HIGH',
    'Persistent Hyperglycemia - 3 Days Above Target',
    'Blood glucose readings consistently elevated: Day 1: 245mg/dL, Day 2: 268mg/dL, Day 3: 252mg/dL. Resident following meal plan. No new symptoms reported.',
    'Physician review for possible insulin adjustment. Rule out infection or medication interaction. Increase monitoring to QID.',
    'Type 2 DM on metformin 1000mg BID + glipizide 5mg daily. Target range 80-180. Last A1C 7.2% (3 months ago). No recent medication changes.',
    now() - interval '2 hours',
    now() + interval '6 hours',
    8,
    'PENDING'
  ) RETURNING id INTO v_escalation_id2;

  -- MEDIUM: Skin concern - needs increased monitoring
  INSERT INTO escalation_queue (
    id,
    agency_id,
    resident_id,
    resident_name,
    escalation_type,
    escalation_level,
    priority,
    title,
    description,
    recommended_action,
    clinical_context,
    escalated_at,
    required_response_by,
    sla_hours,
    status
  ) VALUES (
    gen_random_uuid(),
    p_agency_id,
    p_resident_id,
    p_resident_name,
    'INCREASED_MONITORING',
    1,
    'MEDIUM',
    'Stage 1 Pressure Injury Development - Sacrum',
    'Small area of non-blanchable erythema noted on sacrum during evening care. Approximately 2cm diameter. Skin intact. Resident denies pain.',
    'Increase turning schedule to q2h. Apply barrier cream. Notify physician at next scheduled contact. Document daily with photos.',
    'Braden score: 16 (moderate risk). Limited mobility, requires 2-person assist for transfers. Incontinent of urine. Good nutritional status.',
    now() - interval '4 hours',
    now() + interval '20 hours',
    24,
    'PENDING'
  ) RETURNING id INTO v_escalation_id3;

  -- Create audit entries
  INSERT INTO escalation_audit_log (escalation_id, action, actor_role, new_status, details)
  VALUES
    (v_escalation_id1, 'ESCALATION_CREATED', 'SYSTEM', 'PENDING', '{"source": "automated_monitoring", "trigger": "fall_detection"}'::jsonb),
    (v_escalation_id2, 'ESCALATION_CREATED', 'SYSTEM', 'PENDING', '{"source": "glucose_trend_analysis", "trigger": "3_day_pattern"}'::jsonb),
    (v_escalation_id3, 'ESCALATION_CREATED', 'CAREGIVER', 'PENDING', '{"source": "evening_care_assessment", "trigger": "skin_inspection"}'::jsonb);

  RAISE NOTICE 'Seeded 3 escalations for resident % (agency %)', p_resident_name, p_agency_id;
END;
$$;

-- Grant execute to anon for showcase mode
GRANT EXECUTE ON FUNCTION seed_supervisor_escalations TO anon;
GRANT EXECUTE ON FUNCTION seed_supervisor_escalations TO authenticated;

-- Call this during showcase initialization
COMMENT ON FUNCTION seed_supervisor_escalations IS 'Seeds realistic escalation data for supervisor showcase demos';
