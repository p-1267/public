/**
 * Organization Onboarding Hook
 *
 * Purpose: Manage the Organization Onboarding wizard state machine
 *
 * CRITICAL: This is a STRICT state machine. States CANNOT be skipped or reordered.
 * The state progression is:
 * UNINITIALIZED → ORG_IDENTITY → INSURANCE_CONFIG → SOP_INGESTION →
 * ROLE_DEFAULTS → ESCALATION_BASELINES → LEGAL_ACCEPTANCE → COMPLETED
 *
 * Section 18: Organization Onboarding Wizard
 */

import { useState, useEffect } from 'react';
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

export interface OrganizationConfig {
  legal_name: string;
  organization_type: string;
  country: string;
  state_province: string;
  languages: string[];
  insurance_provider?: string;
  insurance_policy_types?: string[];
  insurance_coverage_scope?: string;
  insurance_expiration_date?: string;
  insurance_incident_timeline?: string;
  insurance_policy_url?: string;
}

export interface SOPDocument {
  id: string;
  category: string;
  file_name: string;
  file_url: string;
  processing_status: string;
  uploaded_at: string;
}

export interface RoleBaseline {
  role_id: string;
  role_name: string;
  permissions: string[];
  auto_apply: boolean;
}

export interface EscalationConfig {
  chain_name: string;
  timeout_minutes: number;
  notification_channels: string[];
  quiet_hours_enabled: boolean;
}

export interface LegalAcceptance {
  typed_legal_name: string;
  acceptance_ip: string;
  device_fingerprint: string;
}

export interface OnboardingStatus {
  current_state: OnboardingState;
  completed_at?: string;
  organization_config?: OrganizationConfig;
  sop_documents?: SOPDocument[];
  role_baselines?: RoleBaseline[];
  escalation_config?: EscalationConfig;
  legal_acceptance?: LegalAcceptance;
}

export function useOrganizationOnboarding(agencyId: string) {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current onboarding status
  const fetchStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: state, error: stateError } = await supabase
        .from('organization_onboarding_state')
        .select('current_state, completed_at')
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (stateError) throw stateError;

      if (!state) {
        setStatus({
          current_state: 'UNINITIALIZED'
        });
        setLoading(false);
        return;
      }

      // Fetch associated data
      const { data: config } = await supabase
        .from('organization_config')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();

      const { data: sops } = await supabase
        .from('sop_documents')
        .select('*')
        .eq('agency_id', agencyId)
        .order('uploaded_at', { ascending: false });

      const { data: baselines } = await supabase
        .from('role_permission_baselines')
        .select('*')
        .eq('agency_id', agencyId);

      const { data: escalation } = await supabase
        .from('escalation_config')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();

      const { data: legal } = await supabase
        .from('legal_acceptance_records')
        .select('*')
        .eq('agency_id', agencyId)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStatus({
        current_state: state.current_state as OnboardingState,
        completed_at: state.completed_at || undefined,
        organization_config: config || undefined,
        sop_documents: sops || undefined,
        role_baselines: baselines || undefined,
        escalation_config: escalation || undefined,
        legal_acceptance: legal || undefined
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agencyId) {
      fetchStatus();
    }
  }, [agencyId]);

  // Initialize onboarding
  const initializeOnboarding = async () => {
    try {
      const { error } = await supabase.rpc('initialize_onboarding', {
        p_agency_id: agencyId
      });

      if (error) throw error;
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Save organization identity
  const saveOrgIdentity = async (data: {
    legal_name: string;
    organization_type: string;
    country: string;
    state_province: string;
    languages: string[];
  }) => {
    try {
      const { error } = await supabase.rpc('save_org_identity', {
        p_agency_id: agencyId,
        p_legal_name: data.legal_name,
        p_organization_type: data.organization_type,
        p_country: data.country,
        p_state_province: data.state_province,
        p_languages: data.languages
      });

      if (error) throw error;
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Save insurance configuration
  const saveInsuranceConfig = async (data: {
    insurance_provider: string;
    insurance_policy_types: string[];
    insurance_coverage_scope: string;
    insurance_expiration_date: string;
    insurance_incident_timeline: string;
    insurance_policy_url?: string;
  }) => {
    try {
      const { error } = await supabase.rpc('save_insurance_config', {
        p_agency_id: agencyId,
        p_insurance_provider: data.insurance_provider,
        p_insurance_policy_types: data.insurance_policy_types,
        p_insurance_coverage_scope: data.insurance_coverage_scope,
        p_insurance_expiration_date: data.insurance_expiration_date,
        p_insurance_incident_timeline: data.insurance_incident_timeline,
        p_insurance_policy_url: data.insurance_policy_url
      });

      if (error) throw error;
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Upload SOP document
  const uploadSOP = async (file: File, category: string) => {
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${agencyId}/${category}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('sop-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sop-documents')
        .getPublicUrl(fileName);

      // Create SOP document record
      const { error: dbError } = await supabase.rpc('upload_sop_document', {
        p_agency_id: agencyId,
        p_category: category,
        p_file_name: file.name,
        p_file_url: urlData.publicUrl
      });

      if (dbError) throw dbError;
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Save role baselines
  const saveRoleBaselines = async (baselines: RoleBaseline[]) => {
    try {
      const { error } = await supabase.rpc('save_role_baselines', {
        p_agency_id: agencyId,
        p_baselines: JSON.stringify(baselines)
      });

      if (error) throw error;
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Save escalation configuration
  const saveEscalationConfig = async (config: EscalationConfig) => {
    try {
      const { error } = await supabase.rpc('save_escalation_config', {
        p_agency_id: agencyId,
        p_chain_name: config.chain_name,
        p_timeout_minutes: config.timeout_minutes,
        p_notification_channels: config.notification_channels,
        p_quiet_hours_enabled: config.quiet_hours_enabled
      });

      if (error) throw error;
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Finalize onboarding with legal acceptance
  const finalizeOnboarding = async (legalAcceptance: LegalAcceptance) => {
    try {
      const { error } = await supabase.rpc('finalize_onboarding', {
        p_agency_id: agencyId,
        p_typed_legal_name: legalAcceptance.typed_legal_name,
        p_acceptance_ip: legalAcceptance.acceptance_ip,
        p_device_fingerprint: legalAcceptance.device_fingerprint
      });

      if (error) throw error;
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Check if a specific state is complete
  const isStateComplete = (state: OnboardingState): boolean => {
    if (!status) return false;

    const stateOrder: OnboardingState[] = [
      'UNINITIALIZED',
      'ORG_IDENTITY',
      'INSURANCE_CONFIG',
      'SOP_INGESTION',
      'ROLE_DEFAULTS',
      'ESCALATION_BASELINES',
      'LEGAL_ACCEPTANCE',
      'COMPLETED'
    ];

    const currentIndex = stateOrder.indexOf(status.current_state);
    const checkIndex = stateOrder.indexOf(state);

    return currentIndex > checkIndex;
  };

  // Get the next required state
  const getNextState = (): OnboardingState | null => {
    if (!status || status.current_state === 'COMPLETED') return null;

    const stateOrder: OnboardingState[] = [
      'UNINITIALIZED',
      'ORG_IDENTITY',
      'INSURANCE_CONFIG',
      'SOP_INGESTION',
      'ROLE_DEFAULTS',
      'ESCALATION_BASELINES',
      'LEGAL_ACCEPTANCE',
      'COMPLETED'
    ];

    const currentIndex = stateOrder.indexOf(status.current_state);
    if (currentIndex >= 0 && currentIndex < stateOrder.length - 1) {
      return stateOrder[currentIndex + 1];
    }

    return null;
  };

  return {
    status,
    loading,
    error,
    initializeOnboarding,
    saveOrgIdentity,
    saveInsuranceConfig,
    uploadSOP,
    saveRoleBaselines,
    saveEscalationConfig,
    finalizeOnboarding,
    isStateComplete,
    getNextState,
    refetch: fetchStatus
  };
}
