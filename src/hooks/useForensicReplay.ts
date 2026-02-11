import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ForensicTimeline {
  id: string;
  timeline_type: string;
  resident_id?: string;
  start_timestamp: string;
  end_timestamp: string;
  timeline_snapshot: any;
  event_count: number;
  decision_point_count: number;
  sop_enforcement_count: number;
  is_sealed: boolean;
  legal_hold: boolean;
}

export interface ForensicDecisionPoint {
  id: string;
  timeline_id: string;
  decision_timestamp: string;
  decision_type: string;
  decision_actor: string;
  decision_context: any;
  decision_input: any;
  decision_output: any;
  decision_reasoning?: string;
  was_blocked: boolean;
  blocking_rule?: string;
  confidence_score?: number;
}

export interface ForensicReplaySession {
  id: string;
  timeline_id: string;
  session_purpose: string;
  requested_by: string;
  session_start: string;
  session_end?: string;
  playback_speed: number;
  findings?: string;
  outcome?: string;
}

export function useForensicReplay() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTimeline = useCallback(async (params: {
    timelineType: string;
    residentId?: string;
    incidentId?: string;
    startTimestamp: string;
    endTimestamp: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data: auditLogs } = await supabase
        .from('audit_log')
        .select('*')
        .gte('timestamp', params.startTimestamp)
        .lte('timestamp', params.endTimestamp)
        .order('timestamp');

      const timelineSnapshot = {
        events: auditLogs || [],
        metadata: {
          generated_at: new Date().toISOString(),
          generated_by: userId,
          scope: params.timelineType
        }
      };

      const participantIds = Array.from(
        new Set((auditLogs || []).map(log => log.actor_id).filter(Boolean))
      );

      const { data, error: insertError } = await supabase
        .from('forensic_timelines')
        .insert({
          timeline_type: params.timelineType,
          resident_id: params.residentId,
          incident_id: params.incidentId,
          start_timestamp: params.startTimestamp,
          end_timestamp: params.endTimestamp,
          timeline_snapshot: timelineSnapshot,
          event_count: auditLogs?.length || 0,
          decision_point_count: 0,
          sop_enforcement_count: 0,
          participant_user_ids: participantIds,
          generated_by: userId
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

  const getTimeline = useCallback(async (timelineId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('forensic_timelines')
        .select('*')
        .eq('id', timelineId)
        .single();

      if (queryError) throw queryError;

      return data as ForensicTimeline;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDecisionPoints = useCallback(async (timelineId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('forensic_decision_points')
        .select('*')
        .eq('timeline_id', timelineId)
        .order('decision_timestamp');

      if (queryError) throw queryError;

      return data as ForensicDecisionPoint[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const startReplaySession = useCallback(async (params: {
    timelineId: string;
    sessionPurpose: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error: insertError } = await supabase
        .from('forensic_replay_sessions')
        .insert({
          timeline_id: params.timelineId,
          session_purpose: params.sessionPurpose,
          requested_by: userId,
          playback_speed: 1.0
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

  const endReplaySession = useCallback(async (sessionId: string, findings?: string, outcome?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('forensic_replay_sessions')
        .update({
          session_end: new Date().toISOString(),
          findings,
          outcome
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (updateError) throw updateError;

      return data;
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
    generateTimeline,
    getTimeline,
    getDecisionPoints,
    startReplaySession,
    endReplaySession
  };
}
