/*
  SUPERVISOR TRIAGE DATA VERIFICATION

  Run these queries in Supabase SQL Editor to verify escalation data exists
  and the supervisor console will display correctly.
*/

-- ============================================================================
-- QUERY 1: Check Escalation Queue Has Data
-- ============================================================================
-- Expected: 3 rows (CRITICAL, HIGH, MEDIUM)

SELECT
  priority,
  title,
  escalation_type,
  status,
  escalated_at,
  required_response_by,
  EXTRACT(EPOCH FROM (required_response_by - now())) / 3600 as hours_remaining,
  (now() > required_response_by) as is_overdue,
  resident_name
FROM escalation_queue
WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'
ORDER BY
  CASE priority
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    ELSE 4
  END;

-- Expected output:
-- priority  | title                                        | escalation_type          | status  | hours_remaining | resident_name
-- ----------|----------------------------------------------|--------------------------|---------|-----------------|---------------
-- CRITICAL  | Resident Fall - Head Impact Reported         | PHYSICIAN_NOTIFICATION   | PENDING | 1.25            | Dorothy Miller
-- HIGH      | Persistent Hyperglycemia - 3 Days Above      | CLINICAL_REVIEW          | PENDING | 6               | Dorothy Miller
-- MEDIUM    | Stage 1 Pressure Injury Development - Sacrum | INCREASED_MONITORING     | PENDING | 20              | Dorothy Miller


-- ============================================================================
-- QUERY 2: Test Supervisor Dashboard RPC (What UI Calls)
-- ============================================================================
-- This is the EXACT RPC the UI calls

SELECT
  escalation_id,
  resident_name,
  priority,
  title,
  status,
  sla_hours_remaining,
  sla_breached,
  has_physician_notification
FROM get_supervisor_escalation_dashboard('a0000000-0000-0000-0000-000000000010');

-- Expected: 3 rows with same data as Query 1


-- ============================================================================
-- QUERY 3: Check SLA Metrics (Top Strip in UI)
-- ============================================================================

SELECT
  total_escalations,
  pending_escalations,
  resolved_escalations,
  breached_sla,
  avg_response_time_hours,
  critical_pending
FROM get_sla_metrics('a0000000-0000-0000-0000-000000000010');

-- Expected output:
-- total_escalations | pending_escalations | resolved_escalations | breached_sla | critical_pending
-- ------------------|---------------------|----------------------|--------------|------------------
-- 3                 | 3                   | 0                    | 0            | 1


-- ============================================================================
-- QUERY 4: Check Clinical Reviews (MD Review Tab)
-- ============================================================================
-- Initially this will be empty until "Notify MD" button is clicked

SELECT
  id,
  resident_name,
  notification_reason,
  urgency,
  notification_status,
  required_by,
  EXTRACT(EPOCH FROM (required_by - now())) / 3600 as hours_until_due
FROM clinician_reviews
WHERE escalation_id IN (
  SELECT id FROM escalation_queue WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'
)
ORDER BY required_by;

-- Expected initially: 0 rows (until "Notify MD" is clicked in UI)
-- After clicking "Notify MD": 1+ rows


-- ============================================================================
-- QUERY 5: Check Intelligence Signals (Intelligence Tab)
-- ============================================================================

SELECT
  category,
  severity,
  title,
  detected_at,
  requires_human_action
FROM intelligence_signals
WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'
  AND requires_human_action = true
ORDER BY detected_at DESC
LIMIT 5;

-- Expected: 0+ rows (intelligence signals are created by brain pipeline)


-- ============================================================================
-- MANUAL FIX: If No Data Exists, Run Seeder
-- ============================================================================

-- Run this if Query 1 returns 0 rows:
SELECT seed_supervisor_escalations(
  'a0000000-0000-0000-0000-000000000010'::uuid,
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'Dorothy Miller'
);

-- Or run full scenario seeder:
SELECT seed_senior_family_scenario();


-- ============================================================================
-- DIAGNOSTIC: Check If Resident Exists
-- ============================================================================

SELECT
  id,
  name,
  risk_level,
  created_at
FROM residents
WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- Expected: 1 row (Dorothy Miller)


-- ============================================================================
-- DIAGNOSTIC: Check If Agency Exists
-- ============================================================================

SELECT
  id,
  name,
  created_at
FROM agencies
WHERE id = 'a0000000-0000-0000-0000-000000000010';

-- Expected: 1 row (Showcase Agency)


-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

-- Run this to get a complete status report:

SELECT
  'Escalations' as entity,
  COUNT(*) as count
FROM escalation_queue
WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'

UNION ALL

SELECT
  'Pending Escalations',
  COUNT(*)
FROM escalation_queue
WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'
  AND status IN ('PENDING', 'IN_PROGRESS')

UNION ALL

SELECT
  'Critical Escalations',
  COUNT(*)
FROM escalation_queue
WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'
  AND priority = 'CRITICAL'

UNION ALL

SELECT
  'Clinical Reviews',
  COUNT(*)
FROM clinician_reviews
WHERE escalation_id IN (
  SELECT id FROM escalation_queue WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'
)

UNION ALL

SELECT
  'Intelligence Signals',
  COUNT(*)
FROM intelligence_signals
WHERE agency_id = 'a0000000-0000-0000-0000-000000000010'
  AND requires_human_action = true;

-- Expected output:
-- entity                  | count
-- ------------------------|-------
-- Escalations             | 3
-- Pending Escalations     | 3
-- Critical Escalations    | 1
-- Clinical Reviews        | 0 (or 1+ after Notify MD)
-- Intelligence Signals    | varies
