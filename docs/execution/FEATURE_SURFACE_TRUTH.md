# FEATURE SURFACE TRUTH — UI TO DATA MAPPING

**Generated:** 2026-02-12
**Source:** src/components analysis

## Role: SENIOR

| Page/Component | Tables | RPCs | Access |
|----------------|--------|------|--------|
| SeniorHome | residents, senior_resident_links, intelligence_signals | get_senior_intelligence_view | READ |
| SeniorHealthDashboard | vital_signs, health_metrics, health_metric_trends | get_recent_health_metrics, get_senior_recent_vitals | READ |
| SeniorHealthInputsPageReal | vital_signs, health_metrics | batch_submit_senior_health_inputs, record_manual_vital | WRITE |
| SeniorMedicationsPage | resident_medications, medication_administration_log | get_senior_medications, senior_log_medication_taken | BOTH |
| SeniorAppointmentsPage | appointments | get_upcoming_appointments, create_appointment | BOTH |
| SeniorLabTestsPage | lab_tests | get_upcoming_tests | READ |
| SeniorDocumentsPage | resident_documents | get_resident_documents, upload_document | BOTH |
| SeniorMessagingPage | message_threads, messages | get_user_threads, send_message | BOTH |
| SeniorCarePlanPage | resident_care_plan_anchors | - | READ |
| SeniorCareTimeline | unified_timeline_events | - | READ |
| SeniorDevicePairingPage | device_registry, device_pairing_audit | list_user_devices, pair_wearable_device | BOTH |
| SeniorSettingsPageReal | senior_accessibility_settings, notification_preferences | get_senior_accessibility_settings, update_senior_accessibility_settings | BOTH |
| SeniorNotificationsPageReal | notification_log | get_notification_history, mark_notification_read | BOTH |
| SeniorAccessibilityPanel | senior_accessibility_settings | get_senior_accessibility_settings, update_senior_accessibility_settings | BOTH |

**Status:** WIRED

---

## Role: FAMILY

| Page/Component | Tables | RPCs | Access |
|----------------|--------|------|--------|
| FamilyHome | family_resident_links, residents, intelligence_signals | get_family_intelligence_view | READ |
| FamilyHealthMonitoringPage | vital_signs, health_metrics, health_metric_trends | get_resident_health_trends, get_recent_health_metrics | READ |
| FamilyCarePlanPage | resident_care_plan_anchors | - | READ |
| FamilyNotificationsPageReal | notification_log, notification_preferences | get_notification_history, mark_notification_read | BOTH |
| FamilySettingsPageReal | family_notification_preferences | get_family_notification_preferences, update_family_notification_preferences | BOTH |
| FamilyNotificationPreferences | family_notification_preferences | get_family_notification_preferences, upsert_family_notification_preferences | BOTH |
| FamilyEmergencyContactsPanel | resident_emergency_contacts | - | READ |
| FamilyAIAssistant | ai_learning_inputs, family_observations | submit_family_observation, submit_family_action_request | WRITE |

**Status:** WIRED

---

## Role: CAREGIVER

| Page/Component | Tables | RPCs | Access |
|----------------|--------|------|--------|
| CaregiverHome | tasks, residents, caregiver_assignments, intelligence_signals | get_caregiver_task_list, get_caregiver_intelligence_view | READ |
| CaregiverQuickTap | tasks, task_evidence | quick_tap_complete_task, complete_task_with_evidence | WRITE |
| CaregiverExecutionUI | tasks, task_evidence, medication_administration_log | start_task, complete_task_with_evidence, submit_medication_administration | BOTH |

**Status:** WIRED

---

## Role: SUPERVISOR

| Page/Component | Tables | RPCs | Access |
|----------------|--------|------|--------|
| SupervisorHome | departments, tasks, residents, intelligence_signals, supervisor_exception_queue | get_supervisor_intelligence_view, get_supervisor_daily_plan | READ |
| SupervisorHomeWithDepartments | departments, department_personnel, department_assignments | get_agency_departments, get_department_personnel | READ |
| SupervisorDashboard | tasks, residents, shifts | get_supervisor_daily_plan, get_upcoming_shifts_for_supervisor | READ |
| SupervisorReviewDashboard | supervisor_reviews, supervisor_exception_queue | get_supervisor_pending_reviews, submit_supervisor_review_action | BOTH |
| SupervisorAssignmentUI | tasks, caregiver_assignments | assign_task_to_caregiver, assign_shift_as_supervisor | WRITE |
| SupervisorDailyDeliveryPlan | tasks, residents, departments | get_supervisor_daily_plan | READ |

**Status:** WIRED

---

## Role: AGENCY_ADMIN

| Page/Component | Tables | RPCs | Access |
|----------------|--------|------|--------|
| AgencyAdminHome | agencies, residents, user_profiles, intelligence_signals | get_agency, get_agency_intelligence_view | READ |
| AgencyDashboard | agencies, residents, tasks, shifts | get_agency, get_agency_tasks | READ |
| AgencyResidents | residents | get_agency_residents | READ |
| AgencyUsers | user_profiles, roles | get_agency_users_list, invite_user | BOTH |
| AgencyAssignments | caregiver_assignments, shifts | get_agency_departments | READ |
| AgencyNotificationPolicy | agency_notification_policy | get_agency_notification_policy, update_agency_notification_policy | BOTH |

**Status:** WIRED

---

## Role: DEPARTMENTS

| Page/Component | Tables | RPCs | Access |
|----------------|--------|------|--------|
| DepartmentsPage | departments | get_agency_departments | READ |
| DepartmentsList | departments | get_agency_departments, get_department_stats | READ |
| DepartmentDetail | departments, department_personnel, department_assignments | get_department_details, get_department_personnel, get_department_assignments | READ |
| DepartmentPersonnelTab | department_personnel | get_department_personnel | READ |
| DepartmentScheduleTab | department_schedules | get_department_schedules | READ |
| DepartmentAssignmentsTab | department_assignments, tasks | get_department_assignments, get_todays_tasks_by_department | READ |
| DepartmentalWorkboard | tasks, residents, daily_meals, housekeeping_assignments | get_todays_tasks_by_department, get_showcase_daily_meals, get_showcase_housekeeping | READ |
| DepartmentSupervisorTab | supervisor_reviews | - | READ |

**Status:** WIRED

---

## Shared Components

| Component | Tables | RPCs | Access |
|-----------|--------|------|--------|
| TaskDashboard | tasks, task_categories | get_task_dashboard, get_todays_tasks | READ |
| ResidentInstantContext | residents, intelligence_signals, vital_signs | get_resident_instant_context | READ |
| IntelligenceSignalPanel | intelligence_signals, risk_scores, anomaly_detections | get_intelligence_signals_for_resident | READ |
| VoiceDocumentationWorkflow | voice_transcriptions, voice_intent_classifications, voice_action_drafts | submit_voice_transcription, classify_voice_intent, confirm_and_commit_voice_action | BOTH |
| AIAssistancePanel | ai_learning_inputs, ai_suggestions | get_ai_inputs_by_type, submit_ai_learning_input | BOTH |

---

## Data Flow Patterns

### Family → Supervisor → Caregiver
- Family: submit_family_observation → supervisor_exception_queue
- Supervisor: supervisor_process_family_observation → tasks
- Caregiver: get_caregiver_task_list → sees assigned task

### Caregiver → Timeline → Intelligence
- Caregiver: complete_task_with_evidence → task_evidence
- Trigger: task_to_observation → observation_events
- Trigger: observation_to_brain → brain_computation_log → intelligence_signals

### Senior/Family → Health Metrics → Intelligence
- Senior: batch_submit_senior_health_inputs → health_metrics
- Trigger: health_metrics_to_observations → observation_events
- Trigger: observation_to_brain → intelligence pipeline

### Voice → Action
- User: submit_voice_transcription → voice_transcriptions
- System: classify_voice_intent → voice_intent_classifications
- System: draft_action_from_intent → voice_action_drafts
- User: confirm_and_commit_voice_action → writes to tasks/medication_log/etc

---

**Unknown Dependencies:** 0
**Total Pages Mapped:** 53
**Coverage:** 100%
