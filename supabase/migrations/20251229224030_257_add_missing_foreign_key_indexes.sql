/*
  # Add Missing Foreign Key Indexes (Performance Enhancement)

  1. Purpose
    - Add indexes to all foreign key columns that lack covering indexes
    - Improves query performance for joins and foreign key constraint checks
    - Addresses performance warnings from database analysis

  2. Impact
    - Significantly improves query performance for related table lookups
    - Faster foreign key constraint validation
    - No breaking changes to application code
    - No data modifications

  3. Index Strategy
    - All foreign key columns receive btree indexes
    - Naming convention: idx_<table>_<column>_fkey
    - Indexes created with IF NOT EXISTS for safety
*/

-- Archival log
CREATE INDEX IF NOT EXISTS idx_archival_log_archived_by_fkey ON public.archival_log(archived_by);

-- Attendance anomalies
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_acknowledged_by_fkey ON public.attendance_anomalies(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_attendance_event_id_fkey ON public.attendance_anomalies(attendance_event_id);

-- Attendance audit
CREATE INDEX IF NOT EXISTS idx_attendance_audit_attendance_event_id_fkey ON public.attendance_audit(attendance_event_id);

-- Backup manifest
CREATE INDEX IF NOT EXISTS idx_backup_manifest_created_by_fkey ON public.backup_manifest(created_by);

-- Billing exports
CREATE INDEX IF NOT EXISTS idx_billing_exports_generated_by_fkey ON public.billing_exports(generated_by);
CREATE INDEX IF NOT EXISTS idx_billing_exports_sealed_by_fkey ON public.billing_exports(sealed_by);

-- Consent registry
CREATE INDEX IF NOT EXISTS idx_consent_registry_granted_by_fkey ON public.consent_registry(granted_by);
CREATE INDEX IF NOT EXISTS idx_consent_registry_revoked_by_fkey ON public.consent_registry(revoked_by);
CREATE INDEX IF NOT EXISTS idx_consent_registry_superseded_by_fkey ON public.consent_registry(superseded_by);

-- Credentials
CREATE INDEX IF NOT EXISTS idx_credentials_live_activated_by_fkey ON public.credentials(live_activated_by);
CREATE INDEX IF NOT EXISTS idx_credentials_live_activation_requested_by_fkey ON public.credentials(live_activation_requested_by);
CREATE INDEX IF NOT EXISTS idx_credentials_revoked_by_fkey ON public.credentials(revoked_by);
CREATE INDEX IF NOT EXISTS idx_credentials_sandbox_activated_by_fkey ON public.credentials(sandbox_activated_by);

-- Data processing log
CREATE INDEX IF NOT EXISTS idx_data_processing_log_consent_id_fkey ON public.data_processing_log(consent_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_processor_user_id_fkey ON public.data_processing_log(processor_user_id);

-- Deployment history
CREATE INDEX IF NOT EXISTS idx_deployment_history_acknowledged_by_fkey ON public.deployment_history(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_deployment_history_deployed_by_fkey ON public.deployment_history(deployed_by);

-- Device registry
CREATE INDEX IF NOT EXISTS idx_device_registry_pairing_actor_fkey ON public.device_registry(pairing_actor);
CREATE INDEX IF NOT EXISTS idx_device_registry_revoked_by_fkey ON public.device_registry(revoked_by);

-- Device trust
CREATE INDEX IF NOT EXISTS idx_device_trust_revoked_by_fkey ON public.device_trust(revoked_by);

-- Environment config
CREATE INDEX IF NOT EXISTS idx_environment_config_created_by_fkey ON public.environment_config(created_by);

-- Erasure requests
CREATE INDEX IF NOT EXISTS idx_erasure_requests_approved_by_fkey ON public.erasure_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_identity_verified_by_fkey ON public.erasure_requests(identity_verified_by);

-- Escalation config
CREATE INDEX IF NOT EXISTS idx_escalation_config_created_by_fkey ON public.escalation_config(created_by);

-- External data ingestion log
CREATE INDEX IF NOT EXISTS idx_external_data_ingestion_log_credential_id_fkey ON public.external_data_ingestion_log(credential_id);

-- External observations
CREATE INDEX IF NOT EXISTS idx_external_observations_reviewed_by_fkey ON public.external_observations(reviewed_by);

-- Financial adjustments
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_approved_by_fkey ON public.financial_adjustments(approved_by);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_performed_by_fkey ON public.financial_adjustments(performed_by);

-- Incident log
CREATE INDEX IF NOT EXISTS idx_incident_log_reported_by_fkey ON public.incident_log(reported_by);

-- Integration conflicts
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_assigned_to_fkey ON public.integration_conflicts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_integration_conflicts_reviewed_by_fkey ON public.integration_conflicts(reviewed_by);

-- Integration registry
CREATE INDEX IF NOT EXISTS idx_integration_registry_activated_by_fkey ON public.integration_registry(activated_by);
CREATE INDEX IF NOT EXISTS idx_integration_registry_created_by_fkey ON public.integration_registry(created_by);
CREATE INDEX IF NOT EXISTS idx_integration_registry_suspended_by_fkey ON public.integration_registry(suspended_by);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_invitations_accepted_by_fkey ON public.invitations(accepted_by);
CREATE INDEX IF NOT EXISTS idx_invitations_intended_role_id_fkey ON public.invitations(intended_role_id);

-- Jurisdictional retention policies
CREATE INDEX IF NOT EXISTS idx_jurisdictional_retention_policies_created_by_fkey ON public.jurisdictional_retention_policies(created_by);
CREATE INDEX IF NOT EXISTS idx_jurisdictional_retention_policies_locked_by_fkey ON public.jurisdictional_retention_policies(locked_by);

-- Legal acceptance records
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_records_accepted_by_fkey ON public.legal_acceptance_records(accepted_by);

-- Legal holds
CREATE INDEX IF NOT EXISTS idx_legal_holds_applied_by_fkey ON public.legal_holds(applied_by);
CREATE INDEX IF NOT EXISTS idx_legal_holds_released_by_fkey ON public.legal_holds(released_by);

-- Legal representatives
CREATE INDEX IF NOT EXISTS idx_legal_representatives_revoked_by_fkey ON public.legal_representatives(revoked_by);
CREATE INDEX IF NOT EXISTS idx_legal_representatives_verified_by_fkey ON public.legal_representatives(verified_by);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_redacted_by_fkey ON public.messages(redacted_by);

-- Organization config
CREATE INDEX IF NOT EXISTS idx_organization_config_created_by_fkey ON public.organization_config(created_by);

-- Organization onboarding state
CREATE INDEX IF NOT EXISTS idx_organization_onboarding_state_locked_by_fkey ON public.organization_onboarding_state(locked_by);

-- Payroll exports
CREATE INDEX IF NOT EXISTS idx_payroll_exports_generated_by_fkey ON public.payroll_exports(generated_by);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_sealed_by_fkey ON public.payroll_exports(sealed_by);

-- Rate limit config
CREATE INDEX IF NOT EXISTS idx_rate_limit_config_created_by_fkey ON public.rate_limit_config(created_by);

-- Resident baselines
CREATE INDEX IF NOT EXISTS idx_resident_baselines_sealed_by_fkey ON public.resident_baselines(sealed_by);

-- Resident care plan anchors
CREATE INDEX IF NOT EXISTS idx_resident_care_plan_anchors_entered_by_fkey ON public.resident_care_plan_anchors(entered_by);

-- Resident consent config
CREATE INDEX IF NOT EXISTS idx_resident_consent_config_consent_obtained_by_fkey ON public.resident_consent_config(consent_obtained_by);
CREATE INDEX IF NOT EXISTS idx_resident_consent_config_revoked_by_fkey ON public.resident_consent_config(revoked_by);

-- Resident emergency contacts
CREATE INDEX IF NOT EXISTS idx_resident_emergency_contacts_entered_by_fkey ON public.resident_emergency_contacts(entered_by);

-- Resident medications
CREATE INDEX IF NOT EXISTS idx_resident_medications_entered_by_fkey ON public.resident_medications(entered_by);

-- Resident physicians
CREATE INDEX IF NOT EXISTS idx_resident_physicians_entered_by_fkey ON public.resident_physicians(entered_by);

-- Role permission baselines
CREATE INDEX IF NOT EXISTS idx_role_permission_baselines_created_by_fkey ON public.role_permission_baselines(created_by);

-- Rollback history
CREATE INDEX IF NOT EXISTS idx_rollback_history_package_id_fkey ON public.rollback_history(package_id);
CREATE INDEX IF NOT EXISTS idx_rollback_history_rolled_back_by_fkey ON public.rollback_history(rolled_back_by);

-- Shifts
CREATE INDEX IF NOT EXISTS idx_shifts_created_by_fkey ON public.shifts(created_by);

-- SOP documents
CREATE INDEX IF NOT EXISTS idx_sop_documents_uploaded_by_fkey ON public.sop_documents(uploaded_by);

-- System versions
CREATE INDEX IF NOT EXISTS idx_system_versions_created_by_fkey ON public.system_versions(created_by);

-- Temporary access grants
CREATE INDEX IF NOT EXISTS idx_temporary_access_grants_manually_revoked_by_fkey ON public.temporary_access_grants(manually_revoked_by);

-- Tenant quotas
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_created_by_fkey ON public.tenant_quotas(created_by);

-- Thread participants
CREATE INDEX IF NOT EXISTS idx_thread_participants_added_by_fkey ON public.thread_participants(added_by);

-- Training modules
CREATE INDEX IF NOT EXISTS idx_training_modules_created_by_fkey ON public.training_modules(created_by);

-- Update audit log
CREATE INDEX IF NOT EXISTS idx_update_audit_log_package_id_fkey ON public.update_audit_log(package_id);

-- Update packages
CREATE INDEX IF NOT EXISTS idx_update_packages_created_by_fkey ON public.update_packages(created_by);
CREATE INDEX IF NOT EXISTS idx_update_packages_signed_by_fkey ON public.update_packages(signed_by);

-- User memberships
CREATE INDEX IF NOT EXISTS idx_user_memberships_revoked_by_fkey ON public.user_memberships(revoked_by);

-- Version compatibility matrix
CREATE INDEX IF NOT EXISTS idx_version_compatibility_matrix_verified_by_fkey ON public.version_compatibility_matrix(verified_by);

-- Workload signals
CREATE INDEX IF NOT EXISTS idx_workload_signals_acknowledged_by_fkey ON public.workload_signals(acknowledged_by);
