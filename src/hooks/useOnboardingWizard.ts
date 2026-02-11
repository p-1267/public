import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type OnboardingState =
  | 'UNINITIALIZED'
  | 'ORG_IDENTITY'
  | 'INSURANCE_CONFIG'
  | 'SOP_INGESTION'
  | 'ROLE_DEFAULTS'
  | 'ESCALATION_BASELINES'
  | 'LEGAL_ACCEPTANCE'
  | 'COMPLETED';

export interface OnboardingStatus {
  initialized: boolean;
  currentState: OnboardingState;
  completedStates: string[];
  locked: boolean;
  lockedAt: string | null;
  hasOrgIdentity: boolean;
  hasInsurance: boolean;
  sopCount: number;
  hasRoleBaselines: boolean;
  hasEscalationConfig: boolean;
  hasLegalAcceptance: boolean;
}

export interface OrgIdentityData {
  legalName: string;
  organizationType: string;
  country: string;
  stateProvince: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
}

export interface InsuranceConfigData {
  insuranceProvider: string;
  policyTypes: string[];
  coverageScope: string;
  expirationDate: string;
  incidentTimeline: string;
  policyUrl: string;
}

export function useOnboardingWizard(agencyId: string | null) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('check_onboarding_status', {
        p_agency_id: agencyId
      });

      if (rpcError) throw rpcError;

      setStatus({
        initialized: data.initialized,
        currentState: data.current_state || 'UNINITIALIZED',
        completedStates: data.completed_states || [],
        locked: data.locked || false,
        lockedAt: data.locked_at || null,
        hasOrgIdentity: data.has_org_identity || false,
        hasInsurance: data.has_insurance || false,
        sopCount: data.sop_count || 0,
        hasRoleBaselines: data.has_role_baselines || false,
        hasEscalationConfig: data.has_escalation_config || false,
        hasLegalAcceptance: data.has_legal_acceptance || false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check onboarding status');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const initializeOnboarding = async () => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data, error: rpcError } = await supabase.rpc('initialize_onboarding', {
      p_agency_id: agencyId
    });

    if (rpcError) throw rpcError;
    if (!data.success) throw new Error(data.error);

    await checkStatus();
    return data;
  };

  const saveOrgIdentity = async (data: OrgIdentityData) => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data: result, error: rpcError } = await supabase.rpc('save_org_identity', {
      p_agency_id: agencyId,
      p_legal_name: data.legalName,
      p_organization_type: data.organizationType,
      p_country: data.country,
      p_state_province: data.stateProvince,
      p_primary_language: data.primaryLanguage,
      p_secondary_languages: data.secondaryLanguages
    });

    if (rpcError) throw rpcError;
    if (!result.success) throw new Error(result.error);

    await checkStatus();
    return result;
  };

  const saveInsuranceConfig = async (data: InsuranceConfigData) => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data: result, error: rpcError } = await supabase.rpc('save_insurance_config', {
      p_agency_id: agencyId,
      p_insurance_provider: data.insuranceProvider,
      p_policy_types: data.policyTypes,
      p_coverage_scope: data.coverageScope,
      p_expiration_date: data.expirationDate,
      p_incident_timeline: data.incidentTimeline,
      p_policy_url: data.policyUrl
    });

    if (rpcError) throw rpcError;
    if (!result.success) throw new Error(result.error);

    await checkStatus();
    return result;
  };

  const uploadSOPDocument = async (
    category: string,
    fileName: string,
    fileUrl: string,
    fileSizeBytes: number,
    mimeType: string
  ) => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data, error: rpcError } = await supabase.rpc('upload_sop_document', {
      p_agency_id: agencyId,
      p_category: category,
      p_file_name: fileName,
      p_file_url: fileUrl,
      p_file_size_bytes: fileSizeBytes,
      p_mime_type: mimeType
    });

    if (rpcError) throw rpcError;
    if (!data.success) throw new Error(data.error);

    await checkStatus();
    return data;
  };

  const completeSOPIngestion = async () => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data, error: rpcError } = await supabase.rpc('complete_sop_ingestion', {
      p_agency_id: agencyId
    });

    if (rpcError) throw rpcError;
    if (!data.success) throw new Error(data.error);

    await checkStatus();
    return data;
  };

  const saveRoleBaselines = async (baselines: any[]) => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data, error: rpcError } = await supabase.rpc('save_role_baselines', {
      p_agency_id: agencyId,
      p_baselines: baselines
    });

    if (rpcError) throw rpcError;
    if (!data.success) throw new Error(data.error);

    await checkStatus();
    return data;
  };

  const saveEscalationConfig = async (config: any) => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data, error: rpcError } = await supabase.rpc('save_escalation_config', {
      p_agency_id: agencyId,
      p_escalation_order: config.escalationOrder,
      p_timeout_durations: config.timeoutDurations,
      p_notification_channels: config.notificationChannels,
      p_quiet_hours_start: config.quietHoursStart,
      p_quiet_hours_end: config.quietHoursEnd
    });

    if (rpcError) throw rpcError;
    if (!data.success) throw new Error(data.error);

    await checkStatus();
    return data;
  };

  const finalizeOnboarding = async (
    typedLegalName: string,
    deviceFingerprint: string,
    acceptedTerms: any
  ) => {
    if (!agencyId) throw new Error('Agency ID required');

    const { data, error: rpcError } = await supabase.rpc('finalize_onboarding', {
      p_agency_id: agencyId,
      p_typed_legal_name: typedLegalName,
      p_device_fingerprint: deviceFingerprint,
      p_accepted_terms: acceptedTerms
    });

    if (rpcError) throw rpcError;
    if (!data.success) throw new Error(data.error);

    await checkStatus();
    return data;
  };

  return {
    status,
    loading,
    error,
    initializeOnboarding,
    saveOrgIdentity,
    saveInsuranceConfig,
    uploadSOPDocument,
    completeSOPIngestion,
    saveRoleBaselines,
    saveEscalationConfig,
    finalizeOnboarding,
    refresh: checkStatus
  };
}
