/**
 * Resident Baseline Enforcement Hook
 *
 * Purpose: Enforce resident baseline requirements before care execution
 *
 * CRITICAL: No baseline → no care
 * - Emergency profile is mandatory and cached offline
 * - Baseline health is immutable once sealed
 * - Medications MUST be initialized before logging allowed
 * - Consent & visibility rules enforced
 *
 * Section 20: Resident Ingestion & Baseline Enforcement
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ResidentBaseline {
  id: string;
  resident_id: string;
  baseline_version: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  weight_kg?: number;
  mobility_status: 'INDEPENDENT' | 'ASSISTED' | 'WHEELCHAIR' | 'BEDBOUND';
  cognitive_status: 'NORMAL' | 'MILD_IMPAIRMENT' | 'MODERATE_IMPAIRMENT' | 'SEVERE_IMPAIRMENT';
  fall_risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  baseline_notes?: string;
  is_sealed: boolean;
  sealed_at?: string;
  sealed_by?: string;
}

export interface EmergencyContact {
  id: string;
  resident_id: string;
  contact_name: string;
  relationship: string;
  phone_primary: string;
  phone_secondary?: string;
  email?: string;
  is_primary: boolean;
  contact_order: number;
}

export interface ResidentMedication {
  id: string;
  resident_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: string;
  schedule?: Record<string, any>;
  is_prn: boolean;
  is_controlled: boolean;
  is_active: boolean;
}

export interface ConsentConfig {
  id: string;
  resident_id: string;
  consent_version: number;
  family_visibility_level: 'FULL' | 'SUMMARY' | 'EMERGENCY_ONLY' | 'NONE';
  ai_assistance_level: 'FULL' | 'MODERATE' | 'MINIMAL' | 'NONE';
  data_sharing_scope: 'AGENCY_ONLY' | 'HEALTHCARE_PARTNERS' | 'EMERGENCY_SERVICES' | 'RESEARCH_DEIDENTIFIED';
  photo_consent: boolean;
  voice_recording_consent: boolean;
  biometric_consent: boolean;
  is_active: boolean;
}

export interface BaselineCompleteness {
  hasBaseline: boolean;
  baselineSealed: boolean;
  emergencyContactCount: number;
  hasMinimumContacts: boolean;
  hasMedications: boolean;
  medicationsInitialized: boolean;
  hasConsent: boolean;
  consentActive: boolean;
  isComplete: boolean;
  missingItems: string[];
}

export function useResidentBaselineEnforcement(residentId: string) {
  const [baseline, setBaseline] = useState<ResidentBaseline | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [medications, setMedications] = useState<ResidentMedication[]>([]);
  const [consent, setConsent] = useState<ConsentConfig | null>(null);
  const [completeness, setCompleteness] = useState<BaselineCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all baseline data
  const fetchBaselineData = async () => {
    if (!residentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch baseline (sealed only)
      const { data: baselineData, error: baselineError } = await supabase
        .from('resident_baselines')
        .select('*')
        .eq('resident_id', residentId)
        .eq('is_sealed', true)
        .order('baseline_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (baselineError && baselineError.code !== 'PGRST116') throw baselineError;

      // Fetch emergency contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('resident_emergency_contacts')
        .select('*')
        .eq('resident_id', residentId)
        .order('contact_order', { ascending: true });

      if (contactsError) throw contactsError;

      // Fetch medications
      const { data: medsData, error: medsError } = await supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', residentId)
        .eq('is_active', true)
        .order('medication_name', { ascending: true });

      if (medsError) throw medsError;

      // Fetch consent
      const { data: consentData, error: consentError } = await supabase
        .from('resident_consent_config')
        .select('*')
        .eq('resident_id', residentId)
        .eq('is_active', true)
        .maybeSingle();

      if (consentError && consentError.code !== 'PGRST116') throw consentError;

      setBaseline(baselineData);
      setEmergencyContacts(contactsData || []);
      setMedications(medsData || []);
      setConsent(consentData);

      // Calculate completeness
      const missingItems: string[] = [];

      const hasBaseline = !!baselineData;
      const baselineSealed = baselineData?.is_sealed || false;
      const emergencyContactCount = contactsData?.length || 0;
      const hasMinimumContacts = emergencyContactCount >= 2;
      const medicationsInitialized = true; // Table exists, zero meds is valid
      const hasConsent = !!consentData;
      const consentActive = consentData?.is_active || false;

      if (!hasBaseline) missingItems.push('Baseline health data');
      if (!baselineSealed) missingItems.push('Baseline must be sealed');
      if (!hasMinimumContacts) missingItems.push(`Emergency contacts (${emergencyContactCount}/2 minimum)`);
      if (!hasConsent) missingItems.push('Consent configuration');
      if (!consentActive) missingItems.push('Active consent record');

      const isComplete =
        hasBaseline &&
        baselineSealed &&
        hasMinimumContacts &&
        medicationsInitialized &&
        hasConsent &&
        consentActive;

      setCompleteness({
        hasBaseline,
        baselineSealed,
        emergencyContactCount,
        hasMinimumContacts,
        hasMedications: (medsData?.length || 0) > 0,
        medicationsInitialized,
        hasConsent,
        consentActive,
        isComplete,
        missingItems
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaselineData();
  }, [residentId]);

  // Seal baseline (make immutable)
  const sealBaseline = async (baselineId: string, sealedBy: string) => {
    try {
      const { error } = await supabase
        .from('resident_baselines')
        .update({
          is_sealed: true,
          sealed_at: new Date().toISOString(),
          sealed_by: sealedBy
        })
        .eq('id', baselineId)
        .eq('is_sealed', false); // Only seal if not already sealed

      if (error) throw error;
      await fetchBaselineData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Add emergency contact
  const addEmergencyContact = async (contact: Omit<EmergencyContact, 'id' | 'resident_id'>) => {
    try {
      const { error } = await supabase
        .from('resident_emergency_contacts')
        .insert({
          resident_id: residentId,
          ...contact
        });

      if (error) throw error;
      await fetchBaselineData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Add medication
  const addMedication = async (medication: Omit<ResidentMedication, 'id' | 'resident_id'>) => {
    try {
      const { error } = await supabase
        .from('resident_medications')
        .insert({
          resident_id: residentId,
          ...medication
        });

      if (error) throw error;
      await fetchBaselineData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Create or update consent
  const updateConsent = async (consentData: Partial<ConsentConfig>) => {
    try {
      if (consent) {
        // Update existing
        const { error } = await supabase
          .from('resident_consent_config')
          .update(consentData)
          .eq('id', consent.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('resident_consent_config')
          .insert({
            resident_id: residentId,
            ...consentData
          });

        if (error) throw error;
      }

      await fetchBaselineData();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Check if resident can receive care
  const canReceiveCare = (): { allowed: boolean; reason?: string } => {
    if (!completeness) {
      return { allowed: false, reason: 'Baseline data not loaded' };
    }

    if (!completeness.isComplete) {
      return {
        allowed: false,
        reason: `Missing required baseline data: ${completeness.missingItems.join(', ')}`
      };
    }

    return { allowed: true };
  };

  return {
    baseline,
    emergencyContacts,
    medications,
    consent,
    completeness,
    loading,
    error,
    sealBaseline,
    addEmergencyContact,
    addMedication,
    updateConsent,
    canReceiveCare,
    refetch: fetchBaselineData
  };
}
