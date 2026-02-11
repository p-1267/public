import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardData {
  summary: {
    completed_count: number;
    pending_count: number;
    overdue_count: number;
    escalated_count: number;
    in_progress_count: number;
    critical_count: number;
  };
  recent_tasks: Array<{
    id: string;
    task_name: string;
    priority: string;
    state: string;
    scheduled_start: string;
    resident_name: string;
  }>;
  active_warnings: Array<{
    id: string;
    task_id: string;
    warning_type: string;
    severity: string;
    message: string;
    created_at: string;
  }>;
  date: string;
}

export type SystemStatus = 'all_clear' | 'attention_needed' | 'urgent';

export function useTaskDashboard(userId?: string, date?: string) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('all_clear');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_task_dashboard', {
        p_user_id: userId,
        p_date: date || new Date().toISOString().split('T')[0]
      });

      if (rpcError) throw rpcError;

      setDashboardData(data as DashboardData);

      if (data.summary.escalated_count > 0 || data.summary.critical_count > 0) {
        setSystemStatus('urgent');
      } else if (data.summary.overdue_count > 0 || data.active_warnings.length > 0) {
        setSystemStatus('attention_needed');
      } else {
        setSystemStatus('all_clear');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => {
    fetchDashboard();

    const channel = supabase
      .channel('task_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboard]);

  return {
    dashboardData,
    systemStatus,
    loading,
    error,
    refetch: fetchDashboard
  };
}
