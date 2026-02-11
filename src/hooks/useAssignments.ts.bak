import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface Assignment {
  id: string;
  agency_id: string;
  resident_id: string;
  caregiver_user_id: string;
  assigned_by: string;
  assigned_at: string;
  removed_at: string | null;
  removed_by: string | null;
  status: string;
  metadata: Record<string, unknown>;
  resident?: {
    full_name: string;
  };
  caregiver?: {
    display_name: string | null;
  };
}

export function useAssignments(agencyId: string | null) {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null;
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (SHOWCASE_MODE && showcaseContext && showcaseContext.dataStore) {
      const store = showcaseContext.dataStore;
      let filteredAssignments = store.assignments;

      if (showcaseContext.currentRole === 'CAREGIVER') {
        filteredAssignments = store.assignments.filter(
          (a: any) => a.caregiver_user_id === showcaseContext.mockUserId
        );
      } else if (showcaseContext.currentRole === 'SENIOR' || showcaseContext.currentRole === 'FAMILY_VIEWER') {
        filteredAssignments = [];
      }

      setAssignments(filteredAssignments.map((a: any) => {
        const resident = store.residents.find((r: any) => r.id === a.resident_id);
        const caregiver = store.users.find((u: any) => u.id === a.caregiver_user_id);
        return {
          ...a,
          resident: resident ? { full_name: resident.full_name } : undefined,
          caregiver: caregiver ? { display_name: caregiver.display_name } : undefined
        };
      }));
      setLoading(false);
      return;
    }

    if (!agencyId) {
      setLoading(false);
      return;
    }

    fetchAssignments();
  }, [agencyId, showcaseContext]);

  const fetchAssignments = async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('caregiver_assignments')
        .select(`
          id,
          agency_id,
          resident_id,
          caregiver_user_id,
          assigned_by,
          assigned_at,
          removed_at,
          removed_by,
          status,
          metadata,
          residents!inner (
            full_name
          ),
          user_profiles!caregiver_assignments_caregiver_user_id_fkey (
            display_name
          )
        `)
        .eq('agency_id', agencyId)
        .order('assigned_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedAssignments = (data || []).map((assignment) => ({
        id: assignment.id,
        agency_id: assignment.agency_id,
        resident_id: assignment.resident_id,
        caregiver_user_id: assignment.caregiver_user_id,
        assigned_by: assignment.assigned_by,
        assigned_at: assignment.assigned_at,
        removed_at: assignment.removed_at,
        removed_by: assignment.removed_by,
        status: assignment.status,
        metadata: assignment.metadata,
        resident: assignment.residents,
        caregiver: assignment.user_profiles
      }));

      setAssignments(formattedAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const assignCaregiver = async (residentId: string, caregiverUserId: string) => {

    if (SHOWCASE_MODE) {
      throw new Error('Showcase Mode: writes are simulated only.');
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('assign_caregiver', {
        p_resident_id: residentId,
        p_caregiver_user_id: caregiverUserId
      });

      if (rpcError) throw rpcError;

      await fetchAssignments();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to assign caregiver';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const removeAssignment = async (assignmentId: string) => {

    if (SHOWCASE_MODE) {
      throw new Error('Showcase Mode: writes are simulated only.');
    }

    try {
      setError(null);

      const { error: rpcError } = await supabase.rpc('remove_assignment', {
        p_assignment_id: assignmentId
      });

      if (rpcError) throw rpcError;

      await fetchAssignments();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove assignment';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    assignments,
    loading,
    error,
    assignCaregiver,
    removeAssignment,
    refresh: fetchAssignments
  };
}
