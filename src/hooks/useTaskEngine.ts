import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Task {
  id: string;
  task_name: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  risk_level: 'A' | 'B' | 'C';
  state: 'scheduled' | 'due' | 'in_progress' | 'completed' | 'skipped' | 'failed' | 'overdue' | 'escalated';
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  resident_id: string;
  owner_user_id: string | null;
  requires_evidence: boolean;
  evidence_submitted: boolean;
  escalation_level: number;
  is_emergency: boolean;
  category_id: string;
  resident?: {
    full_name: string;
  };
  category?: {
    name: string;
    category_type: string;
    color_code: string | null;
  };
}

export interface CollisionInfo {
  collision_detected: boolean;
  current_owner_id?: string;
  current_owner_name?: string;
  task_state?: string;
  started_at?: string;
}

export function useTaskEngine() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCollision = useCallback(async (taskId: string): Promise<CollisionInfo> => {
    const { data, error: rpcError } = await supabase.rpc('check_task_collision', {
      p_task_id: taskId
    });

    if (rpcError) throw rpcError;
    return data as CollisionInfo;
  }, []);

  const logOverride = useCallback(async (taskId: string, reason: string, previousOwnerName?: string) => {
    const { data, error: rpcError } = await supabase.rpc('log_task_override', {
      p_task_id: taskId,
      p_override_reason: reason,
      p_previous_owner_name: previousOwnerName
    });

    if (rpcError) throw rpcError;
    return data;
  }, []);

  const startTask = useCallback(async (taskId: string, overrideReason?: string) => {
    setLoading(true);
    setError(null);
    try {
      const collisionCheck = await checkCollision(taskId);

      if (collisionCheck.collision_detected && !overrideReason) {
        const err = new Error('Task is being worked on by another caregiver') as any;
        err.collisionInfo = collisionCheck;
        throw err;
      }

      if (collisionCheck.collision_detected && overrideReason) {
        await logOverride(taskId, overrideReason, collisionCheck.current_owner_name);
      }

      const { data, error: rpcError } = await supabase.rpc('start_task', {
        p_task_id: taskId
      });

      if (rpcError) throw rpcError;
      if (!data.success) throw new Error(data.error);

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start task';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [checkCollision, logOverride]);

  const completeTask = useCallback(async (
    taskId: string,
    outcome: 'success' | 'partial' | 'failed' = 'success',
    outcomeReason?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('complete_task', {
        p_task_id: taskId,
        p_outcome: outcome,
        p_outcome_reason: outcomeReason
      });

      if (rpcError) throw rpcError;
      if (!data.success) throw new Error(data.error);

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete task';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const skipTask = useCallback(async (taskId: string, reason: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('skip_task', {
        p_task_id: taskId,
        p_reason: reason
      });

      if (rpcError) throw rpcError;
      if (!data.success) throw new Error(data.error);

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to skip task';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAllergyViolations = useCallback(async (
    residentId: string,
    items: Array<{ name: string; [key: string]: any }>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('check_allergy_violations', {
        p_resident_id: residentId,
        p_items: items
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check allergies';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitEvidence = useCallback(async (
    taskId: string,
    evidenceType: 'photo' | 'voice' | 'note' | 'metric' | 'signature' | 'document',
    evidenceData: {
      file_url?: string;
      transcription?: string;
      notes?: string;
      metric_name?: string;
      metric_value?: number;
      metric_unit?: string;
    }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('task_evidence')
        .insert({
          task_id: taskId,
          evidence_type: evidenceType,
          ...evidenceData,
          captured_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit evidence';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    startTask,
    completeTask,
    skipTask,
    checkCollision,
    logOverride,
    checkAllergyViolations,
    submitEvidence,
    loading,
    error
  };
}
