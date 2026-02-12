# SCHEMA TRUTH — LIVE DATABASE STRUCTURE

**Generated:** 2026-02-12
**Source:** Connected Supabase project

## Summary Statistics

- **Tables:** 305
- **RPCs/Functions:** 658
- **Triggers:** 30
- **Enums:** 10
- **RLS Enabled:** 304 tables

## Core Tables (Grouped by Domain)

### Identity & Access
- user_profiles, roles, permissions, role_permissions
- user_identity_state, user_memberships, invitations
- device_trust, temporary_access_grants, access_revocations
- credentials, credential_types, credential_activation_log

### Residents & Care
- residents, resident_baselines, resident_medications, resident_physicians
- resident_emergency_contacts, resident_care_plan_anchors, resident_consent_config
- resident_brain_assessments, resident_access_tokens
- senior_resident_links, family_resident_links

### Agencies & Organizations
- agencies, organization_onboarding_state, organization_config
- departments, department_personnel, department_assignments, department_schedules
- caregiver_assignments, shifts, shift_resident_assignments

### Tasks & Operations
- tasks (42 columns), task_categories, task_templates, task_dependencies
- task_evidence, task_schedules, routine_task_types
- tasks → caregiver execution

### Intelligence & Brain
- brain_state, brain_state_history, brain_computation_log
- observation_events, intelligence_signals
- anomaly_detections, risk_scores, risk_trajectory_projections
- caregiver_baselines, compound_intelligence_events
- prioritized_issues, explainability_narratives

### Health & Vitals
- vital_signs, health_metrics, health_metric_trends
- sensor_readings, device_data_events
- lab_tests, appointments, medication_administration_log

### Notifications & Messaging
- notification_log, notification_deliveries, notification_preferences
- message_threads, messages, message_receipts, announcements
- provider_messages

### Financials
- payroll_exports, billing_exports, caregiver_rates, resident_billing_config
- financial_adjustments, financial_audit, insurance_claims

### Integration & External
- integration_registry, integration_connectors, integration_requests
- device_registry, device_pairing_audit, device_health_log
- voice_transcriptions, voice_intent_classifications, voice_action_drafts
- external_observations, external_data_ingestion_log

### Governance & Audit
- audit_log, transparency_access_log, consent_registry, consent_history
- data_retention_rules, erasure_requests, legal_holds
- sop_documents, sop_violations, sop_enforcement_log

### System & Platform
- system_versions, deployment_history, job_definitions, job_executions
- tenant_metrics, tenant_quotas, rate_limit_config
- backup_manifest, incident_log, resilience_audit_log

### Learning & AI
- ai_learning_inputs, ai_suggestions, ai_assistance_config
- training_modules, training_progress
- learning_system_state, alert_feedback_log, outcome_feedback_log

### Reporting & Analytics
- generated_reports, report_templates, handoff_summaries
- analytics_insights, analytics_domains, forensic_replays

### Showcase & Testing
- showcase_scenario_runs, showcase_state_checkpoints
- conflict_test_scenarios, scenario_models

## Key Enums

- **ai_input_type** (5 values)
- **enforcement_result** (5 values)
- **enforcement_type** (4 values)
- **onboarding_state** (8 values)
- **operating_mode** (2 values: SELF, FAMILY_MANAGED)
- **organization_type** (4 values)
- **sop_category** (5 values)
- **violation_severity** (4 values)
- **violation_type** (5 values)

## RPC Categories

### Read Operations (GET/QUERY)
- get_agency_*, get_caregiver_*, get_resident_*, get_supervisor_*
- get_intelligence_*, get_health_*, get_medication_*
- get_*_dashboard, get_*_list, get_*_history

### Write Operations (CREATE/UPDATE)
- create_*, register_*, submit_*, log_*
- update_*, complete_*, assign_*
- seed_*, generate_*

### Verification & Validation
- verify_*, validate_*, check_*
- measure_*, test_*

### Intelligence & Processing
- compute_*, run_brain_*, run_correlation_*
- detect_*, classify_*, extract_*

### Seeding & Testing
- seed_showcase_*, seed_wp*_*
- test_e2e_*, verify_step*_*

## Active Triggers

- Auto-audit: audit_*_changes (5 triggers)
- Timeline population: auto_populate_timeline_from_* (3 triggers)
- Intelligence pipeline: task_to_observation, observation_to_brain, health_metrics_to_observations
- Notifications: trigger_notify_family_* (3 triggers)
- Health metrics: trigger_auto_calculate_health_trends
- Trajectory: vital_signs_trajectory_trigger

## RLS Coverage

304 of 305 tables have RLS enabled (99.7% coverage)

## Integration Points

- **Edge Functions:** voice-transcription, send-email, send-sms, device-webhook, *-health-webhook
- **External Systems:** FHIR, device providers (Omron, Fitbit, Garmin, Apple Health)
- **Cron Jobs:** pg_cron for scheduled job execution

---

**Usage:** All feature development must reference tables/RPCs from this document. Schema guessing triggers STOP condition.
