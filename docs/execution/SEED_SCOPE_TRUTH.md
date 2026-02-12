# SEED SCOPE TRUTH — MINIMUM DATA REQUIREMENTS

**Generated:** 2026-02-12
**Purpose:** Define minimum non-empty data for each page post-seed

---

## SENIOR Role Requirements

| Page | Required Non-Empty Tables | Prerequisites |
|------|---------------------------|---------------|
| SeniorHome | residents, senior_resident_links, intelligence_signals (≥1) | Resident record, ≥1 intelligence artifact |
| SeniorHealthDashboard | vital_signs (≥1), health_metrics (≥3), health_metric_trends (≥1) | Recent vitals/metrics within 7 days |
| SeniorHealthInputsPageReal | - (write-only page) | Resident record exists |
| SeniorMedicationsPage | resident_medications (≥1), medication_schedules (≥1) | ≥1 active medication |
| SeniorAppointmentsPage | appointments (≥1 upcoming) | ≥1 appointment in next 30 days |
| SeniorLabTestsPage | lab_tests (≥1 upcoming) | ≥1 test scheduled |
| SeniorDocumentsPage | resident_documents (≥2) | Care plan + 1 other document |
| SeniorMessagingPage | message_threads (≥1), messages (≥1) | ≥1 active thread |
| SeniorCarePlanPage | resident_care_plan_anchors (≥1) | Care plan baseline |
| SeniorCareTimeline | unified_timeline_events (≥5) | Recent events (tasks/vitals/meds) |
| SeniorDevicePairingPage | device_registry (≥1) | ≥1 paired device |
| SeniorNotificationsPageReal | notification_log (≥3) | Recent notifications |

**Minimum Seed:** 1 resident + medications + vitals + appointments + timeline events + devices + notifications

---

## FAMILY Role Requirements

| Page | Required Non-Empty Tables | Prerequisites |
|------|---------------------------|---------------|
| FamilyHome | family_resident_links, residents, intelligence_signals (≥1) | Family link + intelligence artifacts |
| FamilyHealthMonitoringPage | vital_signs (≥5), health_metrics (≥5), health_metric_trends (≥1) | Recent health data |
| FamilyCarePlanPage | resident_care_plan_anchors (≥1) | Care plan baseline |
| FamilyNotificationsPageReal | notification_log (≥5) | Recent notifications |
| FamilySettingsPageReal | family_notification_preferences (1 row) | Preference record |

**Minimum Seed:** 1 resident + family link + health data + care plan + notifications + preferences

---

## CAREGIVER Role Requirements

| Page | Required Non-Empty Tables | Prerequisites |
|------|---------------------------|---------------|
| CaregiverHome | tasks (≥3 pending/in_progress), caregiver_assignments (≥1), intelligence_signals (≥1) | Assigned tasks + intelligence |
| CaregiverQuickTap | tasks (≥1 pending) | ≥1 actionable task |
| CaregiverExecutionUI | tasks (≥1 in_progress), task_categories (≥3) | Active task + categories |

**Minimum Seed:** 1 caregiver + ≥3 assigned tasks + resident assignments + intelligence signals

---

## SUPERVISOR Role Requirements

| Page | Required Non-Empty Tables | Prerequisites |
|------|---------------------------|---------------|
| SupervisorHome | departments (≥1), tasks (≥5), supervisor_exception_queue (≥1), intelligence_signals (≥2) | Department + tasks + exceptions + intelligence |
| SupervisorHomeWithDepartments | departments (≥1), department_personnel (≥3), department_assignments (≥2) | Department structure + staff |
| SupervisorDashboard | tasks (≥5), shifts (≥1), residents (≥3) | Daily workload data |
| SupervisorReviewDashboard | supervisor_reviews (≥1), supervisor_exception_queue (≥1) | Pending reviews |
| SupervisorDailyDeliveryPlan | tasks (≥5), residents (≥3), departments (≥1) | Daily tasks by department |

**Minimum Seed:** 1 supervisor + departments + ≥5 tasks + exceptions + reviews + shifts

---

## AGENCY_ADMIN Role Requirements

| Page | Required Non-Empty Tables | Prerequisites |
|------|---------------------------|---------------|
| AgencyAdminHome | agencies (1), residents (≥3), user_profiles (≥5), intelligence_signals (≥2) | Agency + residents + staff + intelligence |
| AgencyDashboard | agencies (1), residents (≥3), tasks (≥10), shifts (≥2) | Agency operational data |
| AgencyResidents | residents (≥3) | ≥3 residents with varied statuses |
| AgencyUsers | user_profiles (≥5), roles (≥3) | Staff across roles |
| AgencyNotificationPolicy | agency_notification_policy (1 row) | Policy configuration |

**Minimum Seed:** 1 agency + ≥3 residents + ≥5 staff + ≥10 tasks + policy config

---

## DEPARTMENTS Role Requirements

| Page | Required Non-Empty Tables | Prerequisites |
|------|---------------------------|---------------|
| DepartmentsPage | departments (≥3) | Nursing, Kitchen, Housekeeping |
| DepartmentDetail | departments (1), department_personnel (≥2), department_assignments (≥3) | Department + staff + work |
| DepartmentPersonnelTab | department_personnel (≥2) | Staff assigned to department |
| DepartmentScheduleTab | department_schedules (≥7) | Weekly schedule |
| DepartmentAssignmentsTab | department_assignments (≥3), tasks (≥5) | Department tasks |
| DepartmentalWorkboard | tasks (≥5), daily_meals (≥3 if kitchen), housekeeping_assignments (≥5 if housekeeping) | Department-specific work |

**Minimum Seed:** ≥3 departments + personnel per department + department-specific tasks

---

## Write Prerequisites (For User Actions)

| Action | Required Pre-Existing Data | Validates |
|--------|----------------------------|-----------|
| Complete task | task exists, resident exists, task_category exists | Task in valid state |
| Log medication | resident_medication exists, resident exists | Medication active |
| Submit health input | resident exists, senior_resident_link exists | Senior authorized |
| Create appointment | resident exists, providers (≥1) | Provider available |
| Assign task | task exists, caregiver exists, caregiver_assignment exists | Caregiver assigned to resident |
| Supervisor review | supervisor_exception_queue entry exists | Exception pending |
| Family observation | family_resident_link exists, resident exists | Family authorized |

---

## Intelligence Pipeline Prerequisites

For ANY role to see intelligence artifacts:

1. **Observation Events (≥3)**: Seeds raw data
2. **Anomaly Detections (≥1)**: Computed from observations
3. **Risk Scores (≥1)**: Computed from baselines + observations
4. **Intelligence Signals (≥1)**: Generated by brain pipeline
5. **Prioritized Issues (optional)**: High-priority signals

**Seed Chain:** Tasks → Task Evidence → Observations → Brain Computation → Intelligence Signals

---

## Timeline Prerequisites

For unified_timeline_events to be non-empty:

- ≥2 completed tasks (trigger: task_to_observation)
- ≥2 health metrics (trigger: health_metrics_to_observations)
- ≥1 medication administration (trigger: medication_to_timeline)

---

## Minimum Universal Seed (All Roles)

1. **Core Records:**
   - 1 agency
   - 3 residents (varied risk levels)
   - 5 user_profiles (1 per role: senior, family, caregiver, supervisor, admin)
   - 3 departments (Nursing, Kitchen, Housekeeping)

2. **Operational Data:**
   - 10 tasks (varied states: pending, in_progress, completed)
   - 3 task_categories (medication, meal, hygiene)
   - 5 caregiver_assignments
   - 2 shifts (1 active, 1 upcoming)

3. **Health Data:**
   - 5 vital_signs per resident (last 7 days)
   - 5 health_metrics per resident
   - 3 health_metric_trends per resident
   - 2 resident_medications per resident

4. **Intelligence:**
   - 5 observation_events per resident
   - 2 intelligence_signals per resident
   - 1 risk_score per resident

5. **Communication:**
   - 3 notifications per user
   - 1 message_thread per user
   - 2 messages per thread

6. **Documents & Config:**
   - 1 resident_care_plan_anchors per resident
   - 1 family_notification_preferences per family
   - 1 senior_accessibility_settings per senior
   - 1 agency_notification_policy per agency

---

## Seed Coverage Verification

**RPC:** `verify_seed_coverage(care_context_id uuid)`

**Returns:**
| page_name | required_sources | missing_sources | status |
|-----------|------------------|-----------------|--------|
| ... | ... | ... | PASS/FAIL |

**Definition:** Page is PASS if all required_sources have row_count > 0.

---

**Enforcement:** Step 4 seed engine must populate ALL required tables above. Zero empty pages allowed.
