import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TenantMetric {
  metric_id: string;
  tenant_id: string;
  metric_timestamp: string;
  metric_type: string;
  metric_component: string;
  metric_value: number;
  metric_unit: string;
  aggregation_window?: string;
}

interface SystemMetric {
  metric_id: string;
  metric_timestamp: string;
  metric_type: string;
  metric_component: string;
  metric_value: number;
  metric_unit: string;
  aggregation_window?: string;
}

interface TenantQuota {
  quota_id: string;
  tenant_id: string;
  resource_type: string;
  quota_limit: number;
  quota_period: string;
  hard_limit: boolean;
  is_active: boolean;
}

interface QuotaUsage {
  usage_id: string;
  tenant_id: string;
  resource_type: string;
  usage_period_start: string;
  usage_period_end: string;
  usage_count: number;
  quota_limit: number;
  quota_exceeded: boolean;
}

export function useScaleMetrics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTenantMetrics = async (tenantId: string, timeWindow: string = '1 hour') => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_tenant_metrics_summary', {
        p_tenant_id: tenantId,
        p_time_window: timeWindow
      });

      if (rpcError) throw rpcError;

      return { metrics: data || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get tenant metrics';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSystemMetrics = async (timeWindow: string = '1 hour') => {
    try {
      setLoading(true);
      setError(null);

      const windowDate = new Date();
      windowDate.setHours(windowDate.getHours() - parseInt(timeWindow));

      const { data, error: queryError } = await supabase
        .from('system_metrics')
        .select('*')
        .gte('metric_timestamp', windowDate.toISOString())
        .order('metric_timestamp', { ascending: false });

      if (queryError) throw queryError;

      return { metrics: data || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get system metrics';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTenantQuotas = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('tenant_quotas')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (queryError) throw queryError;

      return { quotas: data || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get tenant quotas';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getQuotaUsage = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('tenant_quota_usage')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('usage_period_start', { ascending: false })
        .limit(10);

      if (queryError) throw queryError;

      return { usage: data || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quota usage';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkQuota = async (tenantId: string, resourceType: string, incrementAmount: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('check_tenant_quota', {
        p_tenant_id: tenantId,
        p_resource_type: resourceType,
        p_increment_amount: incrementAmount
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check quota';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getIsolationEvidence = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_tenant_isolation_evidence', {
        p_tenant_id: tenantId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get isolation evidence';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getEnforcementProof = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_enforcement_proof', {
        p_tenant_id: tenantId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get enforcement proof';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSeparationProof = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_separation_of_concerns_proof');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get separation proof';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getOperationalReadiness = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_operational_readiness_metrics');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get operational readiness';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getScalingAuditTrail = async (tenantId?: string, timeWindow: string = '24 hours') => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_scaling_audit_trail', {
        p_tenant_id: tenantId || null,
        p_time_window: timeWindow,
        p_component: null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get scaling audit trail';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getTenantMetrics,
    getSystemMetrics,
    getTenantQuotas,
    getQuotaUsage,
    checkQuota,
    getIsolationEvidence,
    getEnforcementProof,
    getSeparationProof,
    getOperationalReadiness,
    getScalingAuditTrail
  };
}
