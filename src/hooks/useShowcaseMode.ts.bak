import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ShowcaseModeState {
  isShowcaseMode: boolean;
  agencyId: string | null;
  agencyName: string | null;
  loading: boolean;
}

export function useShowcaseMode() {
  const [state, setState] = useState<ShowcaseModeState>({
    isShowcaseMode: false,
    agencyId: null,
    agencyName: null,
    loading: true,
  });

  useEffect(() => {
    checkShowcaseMode();
  }, []);

  const checkShowcaseMode = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({
          isShowcaseMode: false,
          agencyId: null,
          agencyName: null,
          loading: false,
        });
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (!profile?.agency_id) {
        setState({
          isShowcaseMode: false,
          agencyId: null,
          agencyName: null,
          loading: false,
        });
        return;
      }

      const { data: agency } = await supabase
        .from('agencies')
        .select('id, name, operating_mode')
        .eq('id', profile.agency_id)
        .single();

      if (agency) {
        setState({
          isShowcaseMode: agency.operating_mode === 'showcase',
          agencyId: agency.id,
          agencyName: agency.name,
          loading: false,
        });
      } else {
        setState({
          isShowcaseMode: false,
          agencyId: null,
          agencyName: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Error checking showcase mode:', error);
      setState({
        isShowcaseMode: false,
        agencyId: null,
        agencyName: null,
        loading: false,
      });
    }
  };

  const switchToAgency = async (agencyId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: agency } = await supabase
      .from('agencies')
      .select('id, name, operating_mode')
      .eq('id', agencyId)
      .single();

    if (agency) {
      await supabase.from('user_profiles').update({ agency_id: agencyId }).eq('id', user.id);

      setState({
        isShowcaseMode: agency.operating_mode === 'showcase',
        agencyId: agency.id,
        agencyName: agency.name,
        loading: false,
      });

      window.location.reload();
    }
  };

  return {
    ...state,
    switchToAgency,
    refresh: checkShowcaseMode,
  };
}
