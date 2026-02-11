import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';

interface SeniorResident {
  id: string;
  full_name: string;
  date_of_birth: string;
  status: string;
  agency_name?: string;
  caregivers: Array<{
    id: string;
    display_name: string;
    assigned_at: string;
  }>;
}

export function useSeniorResident() {
  const [resident, setResident] = useState<SeniorResident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchSeniorResident() {
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
            setResident(null);
            setLoading(false);
          }
          return;
        }

        const { data: residentData, error: residentError } = await supabase
          .from('residents')
          .select(`
            id,
            full_name,
            date_of_birth,
            status,
            agency_id
          `)
          .eq('id', link.resident_id)
          .maybeSingle();

        if (residentError) throw residentError;
        if (!residentData) {
          if (isMounted) {
            setResident(null);
            setLoading(false);
          }
          return;
        }

        const { data: agencyData } = await supabase
          .from('agencies')
          .select('name')
          .eq('id', residentData.agency_id)
          .maybeSingle();

        const { data: assignments, error: assignmentsError } = await supabase
          .from('caregiver_assignments')
          .select(`
            caregiver_user_id,
            assigned_at,
            user_profiles!caregiver_assignments_caregiver_user_id_fkey(
              id,
              display_name
            )
          `)
          .eq('resident_id', link.resident_id)
          .eq('status', 'active')
          .order('assigned_at', { ascending: false });

        if (assignmentsError) throw assignmentsError;

        const caregivers = (assignments || []).map((assignment: any) => ({
          id: assignment.user_profiles.id,
          display_name: assignment.user_profiles.display_name,
          assigned_at: assignment.assigned_at
        }));

        if (isMounted) {
          setResident({
            id: residentData.id,
            full_name: residentData.full_name,
            date_of_birth: residentData.date_of_birth,
            status: residentData.status,
            agency_name: agencyData?.name,
            caregivers
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch resident data'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSeniorResident();

    return () => {
      isMounted = false;
    };
  }, []);

  return { resident, loading, error };
}
