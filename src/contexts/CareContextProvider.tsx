import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface CareContext {
  id: string;
  resident_id: string;
  management_mode: 'SELF' | 'FAMILY_MANAGED' | 'AGENCY_MANAGED';
  care_setting: 'IN_HOME' | 'FACILITY';
  service_model: 'NONE' | 'DIRECT_HIRE' | 'AGENCY_HOME_CARE' | 'AGENCY_FACILITY';
  agency_id: string | null;
  family_admin_user_id: string | null;
  supervision_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CareContextState {
  context: CareContext | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createDefault: (residentId: string) => Promise<void>;
}

const CareContextContext = createContext<CareContextState | undefined>(undefined);

export function CareContextProvider({
  residentId,
  children
}: {
  residentId: string | null;
  children: ReactNode;
}) {
  const [context, setContext] = useState<CareContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = async () => {
    if (!residentId) {
      setContext(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_active_care_context', {
        p_resident_id: residentId
      });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        setContext(data[0]);
      } else {
        setContext(null);
      }
    } catch (err) {
      console.error('Error fetching care context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load care context');
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  const createDefault = async (resId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_default_care_context', {
        p_resident_id: resId
      });

      if (rpcError) throw rpcError;

      await fetchContext();
    } catch (err) {
      console.error('Error creating default context:', err);
      setError(err instanceof Error ? err.message : 'Failed to create default context');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [residentId]);

  return (
    <CareContextContext.Provider
      value={{
        context,
        loading,
        error,
        refetch: fetchContext,
        createDefault
      }}
    >
      {children}
    </CareContextContext.Provider>
  );
}

export function useCareContext() {
  const ctx = useContext(CareContextContext);
  if (ctx === undefined) {
    throw new Error('useCareContext must be used within CareContextProvider');
  }
  return ctx;
}
