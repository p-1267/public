import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAnalytics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAnalyticsDomains = useCallback(async () => {
          {
            domain_id: 'workforce',
            domain_name: 'WORKFORCE_UTILIZATION',
            domain_description: 'Workforce utilization and efficiency',
            is_read_only: true,
            can_execute_actions: false,
            can_block_workflows: false,
            can_override_policy: false,
            is_active: true
          },
          {
            domain_id: 'attendance',
            domain_name: 'ATTENDANCE_PATTERNS',
            domain_description: 'Attendance patterns and trends',
            is_read_only: true,
            can_execute_actions: false,
            can_block_workflows: false,
            can_override_policy: false,
            is_active: true
          },
          {
            domain_id: 'device',
            domain_name: 'DEVICE_RELIABILITY',
            domain_description: 'Device reliability and health metrics',
            is_read_only: true,
            can_execute_actions: false,
            can_block_workflows: false,
            can_override_policy: false,
            is_active: true
          },
          {
            domain_id: 'incident',
            domain_name: 'INCIDENT_FREQUENCY',
            domain_description: 'Incident frequency and severity analysis',
            is_read_only: true,
            can_execute_actions: false,
            can_block_workflows: false,
            can_override_policy: false,
            is_active: true
          },
          {
            domain_id: 'compliance',
            domain_name: 'COMPLIANCE_INDICATORS',
            domain_description: 'Compliance indicators and metrics',
            is_read_only: true,
            can_execute_actions: false,
            can_block_workflows: false,
            can_override_policy: false,
            is_active: true
          }
        ]
      };
    }

    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_analytics_domains');

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get analytics domains';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getInsightsByDomain = useCallback(async (domainId: string, limit: number = 50) => {
        ]
      };
    }

    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_analytics_insights_by_domain', {
        p_domain_id: domainId,
        p_limit: limit
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get insights';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getInsightDetail = useCallback(async (insightId: string) => {
          confidence_level: 0.9,
          is_stale: false,
          is_incomplete: false,
          is_read_only: true,
          can_trigger_action: false
        }
      };
    }

    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_analytics_insight_detail', {
        p_insight_id: insightId
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get insight detail';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    getAnalyticsDomains,
    getInsightsByDomain,
    getInsightDetail
  };
}
