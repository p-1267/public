import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';

interface CareTimelineEntry {
  id: string;
  action_type: string;
  actor_name: string;
  created_at: string;
  metadata?: any;
  previous_state?: any;
  new_state?: any;
}

export function useSeniorCareTimeline() {
  const [timeline, setTimeline] = useState<CareTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCareTimeline() {
      try {
        setLoading(true);
        setError(null);

        // SHOWCASE_MODE: Use fixed senior user ID
        let userId: string;
        if (SHOWCASE_MODE) {
          userId = 'b0000000-0000-0000-0000-000000000001'; // Dorothy Miller
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('Not authenticated');
          }
          userId = user.id;
        }

        const { data: link, error: linkError } = await supabase
          .from('senior_resident_links')
          .select('resident_id')
          .eq('senior_user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (linkError) throw linkError;
        if (!link) {
          if (isMounted) {
            setTimeline([]);
            setLoading(false);
          }
          return;
        }

        const { data: auditEntries, error: auditError } = await supabase
          .from('audit_log')
          .select(`
            id,
            action_type,
            actor_id,
            created_at,
            metadata,
            previous_state,
            new_state
          `)
          .eq('target_id', link.resident_id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (auditError) throw auditError;

        const actorIds = [...new Set(auditEntries?.map(e => e.actor_id).filter(Boolean))];

        let actorMap: Record<string, string> = {};
        if (actorIds.length > 0) {
          const { data: actors } = await supabase
            .from('user_profiles')
            .select('id, display_name')
            .in('id', actorIds);

          if (actors) {
            actorMap = actors.reduce((acc, actor) => {
              acc[actor.id] = actor.display_name;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        const timelineEntries = (auditEntries || []).map(entry => ({
          id: entry.id,
          action_type: entry.action_type,
          actor_name: actorMap[entry.actor_id] || 'System',
          created_at: entry.created_at,
          metadata: entry.metadata,
          previous_state: entry.previous_state,
          new_state: entry.new_state
        }));

        if (isMounted) {
          setTimeline(timelineEntries);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch care timeline'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCareTimeline();

    const channel = supabase
      .channel('senior-care-timeline')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_log'
        },
        () => {
          fetchCareTimeline();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, []);

  return { timeline, loading, error };
}
