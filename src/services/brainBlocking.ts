/**
 * Brain Blocking Service
 *
 * Purpose: Central enforcement engine that blocks unsafe/illegal actions
 *
 * CRITICAL: This service enforces ALL Phase 1 legal and safety requirements.
 * When any action is blocked, it MUST explain:
 * - The blocking rule name
 * - The originating master-spec section
 * - The risk being prevented
 * - The remediation path
 *
 * NO action can bypass this service.
 * NO demo mode shortcuts allowed in production paths.
 */

import { supabase } from '../lib/supabase';

export type BlockingReason =
  | 'ONBOARDING_INCOMPLETE'
  | 'INSURANCE_INCOMPLETE'
  | 'SOP_NOT_INGESTED'
  | 'RESIDENT_NO_BASELINE'
  | 'USER_IDENTITY_INVALID'
  | 'USER_REVOKED'
  | 'USER_SUSPENDED'
  | 'CONSENT_MISSING'
  | 'TENANT_ISOLATION_VIOLATED'
  | 'EMERGENCY_PROFILE_MISSING'
  | 'SOP_VIOLATION';

export interface BlockingRule {
  reason: BlockingReason;
  masterSpecSection: string;
  riskPrevented: string;
  remediationPath: string;
  blockingDetails?: Record<string, any>;
}

export interface BlockingResult {
  blocked: boolean;
  rule?: BlockingRule;
}

/**
 * Check if organization has completed onboarding
 * Section 18: Organization Onboarding Wizard
 */
export async function checkOrganizationOnboarding(agencyId: string): Promise<BlockingResult> {
  const { data: onboardingState, error } = await supabase
    .from('organization_onboarding_state')
    .select('current_state, completed_at')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) {
    console.error('Error checking onboarding state:', error);
    return {
      blocked: true,
      rule: {
        reason: 'ONBOARDING_INCOMPLETE',
        masterSpecSection: 'Section 18 - Organization Onboarding',
        riskPrevented: 'Operating without proper legal, insurance, and SOP configuration creates liability exposure',
        remediationPath: 'Complete the Organization Onboarding wizard at /admin/onboarding',
        blockingDetails: { error: error.message }
      }
    };
  }

  if (!onboardingState || onboardingState.current_state !== 'COMPLETED' || !onboardingState.completed_at) {
    return {
      blocked: true,
      rule: {
        reason: 'ONBOARDING_INCOMPLETE',
        masterSpecSection: 'Section 18 - Organization Onboarding',
        riskPrevented: 'Care execution without completed onboarding invalidates insurance claims and exposes agency to legal liability',
        remediationPath: 'Complete all onboarding steps: Organization Identity, Insurance Config, SOP Ingestion, Role Defaults, Escalation Baselines, and Legal Acceptance',
        blockingDetails: { currentState: onboardingState?.current_state || 'UNINITIALIZED' }
      }
    };
  }

  return { blocked: false };
}

/**
 * Check if organization has valid insurance configuration
 * Section 18.3: Insurance & Liability Configuration
 */
export async function checkInsuranceConfiguration(agencyId: string): Promise<BlockingResult> {
  const { data: config, error } = await supabase
    .from('organization_config')
    .select('insurance_provider, insurance_policy_types, insurance_coverage_scope, insurance_expiration_date')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error || !config) {
    return {
      blocked: true,
      rule: {
        reason: 'INSURANCE_INCOMPLETE',
        masterSpecSection: 'Section 18.3 - Insurance Configuration',
        riskPrevented: 'Operating without valid insurance configuration invalidates claims and exposes agency to uninsured liability',
        remediationPath: 'Complete Insurance Configuration in the Organization Onboarding wizard',
        blockingDetails: { error: error?.message }
      }
    };
  }

  // Check expiration
  if (config.insurance_expiration_date) {
    const expirationDate = new Date(config.insurance_expiration_date);
    const now = new Date();
    if (expirationDate < now) {
      return {
        blocked: true,
        rule: {
          reason: 'INSURANCE_INCOMPLETE',
          masterSpecSection: 'Section 18.3 - Insurance Configuration',
          riskPrevented: 'Expired insurance policy means care activities are uninsured and expose agency to direct liability',
          remediationPath: 'Update insurance expiration date in Agency Settings > Insurance Configuration',
          blockingDetails: { expiredOn: config.insurance_expiration_date }
        }
      };
    }
  }

  return { blocked: false };
}

/**
 * Check if required SOPs are ingested and enforced
 * Section 18.4: SOP Ingestion → Executable Enforcement
 */
export async function checkSOPIngestion(agencyId: string, requiredCategories: string[]): Promise<BlockingResult> {
  const { data: sops, error } = await supabase
    .from('sop_documents')
    .select('category, processing_status')
    .eq('agency_id', agencyId)
    .in('category', requiredCategories);

  if (error) {
    return {
      blocked: true,
      rule: {
        reason: 'SOP_NOT_INGESTED',
        masterSpecSection: 'Section 18.4 - SOP Ingestion',
        riskPrevented: 'Operating without ingested SOPs means care delivery has no enforceable standards',
        remediationPath: 'Upload and process required SOP documents in Organization Onboarding',
        blockingDetails: { error: error.message }
      }
    };
  }

  const processedCategories = new Set(
    sops?.filter(s => s.processing_status === 'COMPLETED').map(s => s.category) || []
  );

  const missingCategories = requiredCategories.filter(cat => !processedCategories.has(cat));

  if (missingCategories.length > 0) {
    return {
      blocked: true,
      rule: {
        reason: 'SOP_NOT_INGESTED',
        masterSpecSection: 'Section 18.4 - SOP Ingestion',
        riskPrevented: `Missing SOPs (${missingCategories.join(', ')}) means no enforceable standards for these critical areas`,
        remediationPath: `Upload and process SOPs for: ${missingCategories.join(', ')}`,
        blockingDetails: { missingCategories }
      }
    };
  }

  return { blocked: false };
}

/**
 * Check if user has valid identity state
 * Section 19: Identity Lifecycle & Revocation
 */
export async function checkUserIdentity(userId: string): Promise<BlockingResult> {
  const { data: identityState, error } = await supabase
    .from('user_identity_state')
    .select('current_state, suspended_reason, revoked_reason, revoked_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return {
      blocked: true,
      rule: {
        reason: 'USER_IDENTITY_INVALID',
        masterSpecSection: 'Section 19 - Identity Lifecycle',
        riskPrevented: 'User without verified identity state poses security and audit risk',
        remediationPath: 'Contact administrator to verify identity state',
        blockingDetails: { error: error.message }
      }
    };
  }

  if (!identityState) {
    return {
      blocked: true,
      rule: {
        reason: 'USER_IDENTITY_INVALID',
        masterSpecSection: 'Section 19 - Identity Lifecycle',
        riskPrevented: 'User without identity state record cannot be audited or held accountable',
        remediationPath: 'Complete user verification process',
        blockingDetails: { state: 'MISSING' }
      }
    };
  }

  // Check for revocation
  if (identityState.current_state === 'REVOKED') {
    return {
      blocked: true,
      rule: {
        reason: 'USER_REVOKED',
        masterSpecSection: 'Section 19 - Identity Lifecycle',
        riskPrevented: 'Revoked user access prevents unauthorized actions and maintains audit integrity',
        remediationPath: 'Access has been permanently revoked. Contact administrator if this is incorrect.',
        blockingDetails: {
          revokedAt: identityState.revoked_at,
          reason: identityState.revoked_reason
        }
      }
    };
  }

  // Check for suspension
  if (identityState.current_state === 'SUSPENDED') {
    return {
      blocked: true,
      rule: {
        reason: 'USER_SUSPENDED',
        masterSpecSection: 'Section 19 - Identity Lifecycle',
        riskPrevented: 'Suspended user access prevents potentially unsafe actions during investigation',
        remediationPath: 'Access is temporarily suspended. Contact supervisor for details.',
        blockingDetails: {
          reason: identityState.suspended_reason
        }
      }
    };
  }

  // Only ACTIVE users can proceed
  if (identityState.current_state !== 'ACTIVE') {
    return {
      blocked: true,
      rule: {
        reason: 'USER_IDENTITY_INVALID',
        masterSpecSection: 'Section 19 - Identity Lifecycle',
        riskPrevented: 'Only fully verified and active users can perform care actions',
        remediationPath: `Complete identity verification. Current state: ${identityState.current_state}`,
        blockingDetails: { currentState: identityState.current_state }
      }
    };
  }

  return { blocked: false };
}

/**
 * Check if resident has required baseline data
 * Section 20: Resident Ingestion & Baseline Enforcement
 */
export async function checkResidentBaseline(residentId: string): Promise<BlockingResult> {
  // Check for baseline health data
  const { data: baseline, error: baselineError } = await supabase
    .from('resident_baselines')
    .select('id, is_sealed')
    .eq('resident_id', residentId)
    .eq('is_sealed', true)
    .maybeSingle();

  if (baselineError || !baseline) {
    return {
      blocked: true,
      rule: {
        reason: 'RESIDENT_NO_BASELINE',
        masterSpecSection: 'Section 20 - Resident Baseline',
        riskPrevented: 'Care without baseline health data means no reference point for detecting changes or emergencies',
        remediationPath: 'Complete resident baseline data entry and seal the baseline',
        blockingDetails: { error: baselineError?.message }
      }
    };
  }

  // Check for emergency contacts (minimum 2)
  const { count: contactCount, error: contactError } = await supabase
    .from('resident_emergency_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('resident_id', residentId);

  if (contactError || !contactCount || contactCount < 2) {
    return {
      blocked: true,
      rule: {
        reason: 'EMERGENCY_PROFILE_MISSING',
        masterSpecSection: 'Section 20 - Resident Baseline',
        riskPrevented: 'Insufficient emergency contacts means inability to notify family during emergencies',
        remediationPath: 'Add at least 2 emergency contacts for this resident',
        blockingDetails: { currentCount: contactCount || 0, requiredCount: 2 }
      }
    };
  }

  // Check for medications
  const { count: medicationCount, error: medicationError } = await supabase
    .from('resident_medications')
    .select('id', { count: 'exact', head: true })
    .eq('resident_id', residentId)
    .eq('is_active', true);

  if (medicationError) {
    return {
      blocked: true,
      rule: {
        reason: 'RESIDENT_NO_BASELINE',
        masterSpecSection: 'Section 20 - Resident Baseline',
        riskPrevented: 'Cannot verify medication list completeness',
        remediationPath: 'Complete resident medication list entry',
        blockingDetails: { error: medicationError.message }
      }
    };
  }

  // Medications can be zero (no meds), but must be explicitly initialized

  return { blocked: false };
}

/**
 * Check if resident has valid consent configuration
 * Section 20.6: Resident Consent Configuration
 */
export async function checkResidentConsent(residentId: string, requiredConsentTypes?: string[]): Promise<BlockingResult> {
  const { data: consent, error } = await supabase
    .from('resident_consent_config')
    .select('*')
    .eq('resident_id', residentId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !consent) {
    return {
      blocked: true,
      rule: {
        reason: 'CONSENT_MISSING',
        masterSpecSection: 'Section 20.6 - Resident Consent',
        riskPrevented: 'Care without documented consent violates patient rights and HIPAA requirements',
        remediationPath: 'Complete resident consent configuration',
        blockingDetails: { error: error?.message }
      }
    };
  }

  // Check specific consent types if required
  if (requiredConsentTypes) {
    const missingConsents: string[] = [];

    if (requiredConsentTypes.includes('photo') && !consent.photo_consent) {
      missingConsents.push('photo');
    }
    if (requiredConsentTypes.includes('voice') && !consent.voice_recording_consent) {
      missingConsents.push('voice recording');
    }
    if (requiredConsentTypes.includes('biometric') && !consent.biometric_consent) {
      missingConsents.push('biometric');
    }

    if (missingConsents.length > 0) {
      return {
        blocked: true,
        rule: {
          reason: 'CONSENT_MISSING',
          masterSpecSection: 'Section 20.6 - Resident Consent',
          riskPrevented: `Missing consent for ${missingConsents.join(', ')} violates patient rights`,
          remediationPath: `Obtain consent for: ${missingConsents.join(', ')}`,
          blockingDetails: { missingConsents }
        }
      };
    }
  }

  return { blocked: false };
}

/**
 * Check tenant isolation
 * Section 36: Multi-Tenancy & Isolation
 */
export async function checkTenantIsolation(userId: string, agencyId: string): Promise<BlockingResult> {
  const { data: userProfile, error } = await supabase
    .from('user_profiles')
    .select('agency_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !userProfile) {
    return {
      blocked: true,
      rule: {
        reason: 'TENANT_ISOLATION_VIOLATED',
        masterSpecSection: 'Section 36 - Multi-Tenancy',
        riskPrevented: 'Cross-tenant access violates data isolation and HIPAA requirements',
        remediationPath: 'Contact system administrator',
        blockingDetails: { error: error?.message }
      }
    };
  }

  if (userProfile.agency_id !== agencyId) {
    return {
      blocked: true,
      rule: {
        reason: 'TENANT_ISOLATION_VIOLATED',
        masterSpecSection: 'Section 36 - Multi-Tenancy',
        riskPrevented: 'User attempting to access data from different agency violates tenant isolation',
        remediationPath: 'You can only access data from your own agency',
        blockingDetails: {
          userAgency: userProfile.agency_id,
          attemptedAgency: agencyId
        }
      }
    };
  }

  return { blocked: false };
}

/**
 * Master blocking check - runs ALL Phase 1 checks
 * Returns the FIRST blocking condition encountered
 */
export async function checkAllPhase1Requirements(
  userId: string,
  agencyId: string,
  residentId?: string
): Promise<BlockingResult> {
  // 1. Check user identity (must be ACTIVE)
  const userCheck = await checkUserIdentity(userId);
  if (userCheck.blocked) return userCheck;

  // 2. Check tenant isolation
  const tenantCheck = await checkTenantIsolation(userId, agencyId);
  if (tenantCheck.blocked) return tenantCheck;

  // 3. Check organization onboarding
  const onboardingCheck = await checkOrganizationOnboarding(agencyId);
  if (onboardingCheck.blocked) return onboardingCheck;

  // 4. Check insurance configuration
  const insuranceCheck = await checkInsuranceConfiguration(agencyId);
  if (insuranceCheck.blocked) return insuranceCheck;

  // 5. Check required SOPs (mandatory categories)
  const requiredSOPs = ['MEDICATION_HANDLING', 'EMERGENCY_ESCALATION', 'DOCUMENTATION_TIMING'];
  const sopCheck = await checkSOPIngestion(agencyId, requiredSOPs);
  if (sopCheck.blocked) return sopCheck;

  // 6. Check resident baseline (if resident is specified)
  if (residentId) {
    const baselineCheck = await checkResidentBaseline(residentId);
    if (baselineCheck.blocked) return baselineCheck;

    const consentCheck = await checkResidentConsent(residentId);
    if (consentCheck.blocked) return consentCheck;
  }

  // All checks passed
  return { blocked: false };
}

/**
 * Format blocking rule for UI display
 */
export function formatBlockingMessage(rule: BlockingRule): string {
  return `
🚫 ACTION BLOCKED

Rule: ${rule.reason}
Master Spec: ${rule.masterSpecSection}

Why this is blocked:
${rule.riskPrevented}

How to proceed:
${rule.remediationPath}
${rule.blockingDetails ? '\n\nDetails: ' + JSON.stringify(rule.blockingDetails, null, 2) : ''}
  `.trim();
}
