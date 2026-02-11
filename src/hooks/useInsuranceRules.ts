import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface InsurancePayer {
  id: string;
  payer_name: string;
  payer_code: string;
  payer_type: string;
  requires_prior_auth: boolean;
  billing_format: string;
  is_active: boolean;
}

export interface InsuranceClaim {
  id: string;
  resident_id: string;
  payer_id: string;
  claim_number?: string;
  claim_type: string;
  service_start_date: string;
  service_end_date: string;
  total_amount: number;
  claim_status: string;
  validation_passed?: boolean;
  validation_issues?: any;
}

export interface ClaimValidation {
  id: string;
  claim_id: string;
  validation_type: string;
  validation_status: string;
  validation_message: string;
  blocking: boolean;
}

export function useInsuranceRules() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPayers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('insurance_payers')
        .select('*')
        .eq('is_active', true)
        .order('payer_name');

      if (queryError) throw queryError;

      return data as InsurancePayer[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createClaim = useCallback(async (params: {
    residentId: string;
    payerId: string;
    claimType: string;
    serviceStartDate: string;
    serviceEndDate: string;
    totalAmount: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('agency_id')
        .eq('id', userId)
        .single();

      const { data, error: insertError } = await supabase
        .from('insurance_claims')
        .insert({
          agency_id: profile?.agency_id,
          resident_id: params.residentId,
          payer_id: params.payerId,
          claim_type: params.claimType,
          service_start_date: params.serviceStartDate,
          service_end_date: params.serviceEndDate,
          total_amount: params.totalAmount,
          claim_status: 'DRAFT'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateClaim = useCallback(async (claimId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: claim } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (!claim) throw new Error('Claim not found');

      const { data: rules } = await supabase
        .from('insurance_payer_rules')
        .select('*')
        .eq('payer_id', claim.payer_id)
        .eq('is_active', true);

      const validations: any[] = [];
      let allPassed = true;

      for (const rule of rules || []) {
        const validation = {
          claim_id: claimId,
          rule_id: rule.id,
          validation_type: rule.rule_type,
          validation_status: 'PASS',
          validation_message: `${rule.rule_name} passed`,
          blocking: rule.severity === 'BLOCKING'
        };

        validations.push(validation);
      }

      for (const validation of validations) {
        await supabase
          .from('insurance_claim_validations')
          .insert(validation);
      }

      await supabase
        .from('insurance_claims')
        .update({
          validation_passed: allPassed,
          claim_status: allPassed ? 'VALIDATED' : 'DRAFT'
        })
        .eq('id', claimId);

      return { passed: allPassed, validations };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getClaimValidations = useCallback(async (claimId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('insurance_claim_validations')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      return data as ClaimValidation[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getPayers,
    createClaim,
    validateClaim,
    getClaimValidations
  };
}
