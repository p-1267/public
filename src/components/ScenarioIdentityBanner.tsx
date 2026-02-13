import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import { SHOWCASE_MODE } from '../config/showcase';
import { Info } from 'lucide-react';

interface CareContext {
  management_mode: string;
  care_setting: string;
  service_model: string;
  supervision_enabled: boolean;
  agency_id: string | null;
}

interface ScenarioIdentityBannerProps {
  residentId: string;
}

export function ScenarioIdentityBanner({ residentId }: ScenarioIdentityBannerProps) {
  const { currentScenario } = useShowcase();
  const [context, setContext] = useState<CareContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[ScenarioIdentityBanner] Init - residentId:', residentId, 'SHOWCASE_MODE:', SHOWCASE_MODE, 'currentScenario:', currentScenario);

    // In showcase mode, use ShowcaseContext directly instead of DB lookup
    if (SHOWCASE_MODE && currentScenario) {
      console.log('[ScenarioIdentityBanner] Using showcase context - scenario:', currentScenario.id, currentScenario.name);
      setLoading(false);
      return;
    }

    fetchCareContext();
  }, [residentId, currentScenario]);

  const fetchCareContext = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_care_context', {
        p_resident_id: residentId
      });

      if (error) {
        console.error('[ScenarioIdentityBanner] Failed to fetch context:', error);
        setLoading(false);
        return;
      }

      if (data) {
        console.log('[ScenarioIdentityBanner] Fetched context from DB:', data);
        setContext(data);
      } else {
        console.warn('[ScenarioIdentityBanner] No context returned from DB');
      }
      setLoading(false);
    } catch (err) {
      console.error('[ScenarioIdentityBanner] Exception:', err);
      setLoading(false);
    }
  };

  // In showcase mode, use currentScenario
  if (SHOWCASE_MODE && currentScenario) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-blue-900">
                Active Scenario:
              </span>
            </div>
            <span className="text-sm font-bold text-blue-700">
              {currentScenario.name}
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-blue-800">
            <div>
              <span className="font-semibold">ID: </span>
              {currentScenario.id}
            </div>
            <div>
              <span className="font-semibold">Mode: </span>
              SHOWCASE
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !context) {
    return null;
  }

  const getScenarioLabel = () => {
    const { management_mode, care_setting, service_model } = context;

    if (management_mode === 'SELF' && service_model === 'NONE') {
      return 'A) SELF - Senior Independent';
    }
    if (management_mode === 'FAMILY_MANAGED' && service_model === 'NONE') {
      return 'B) FAMILY_MANAGED - Family Oversight';
    }
    if (management_mode === 'FAMILY_MANAGED' && service_model === 'DIRECT_HIRE') {
      return 'C) DIRECT_HIRE - Family Hires Caregiver';
    }
    if (management_mode === 'AGENCY_MANAGED' && care_setting === 'IN_HOME') {
      return 'D) AGENCY_HOME_CARE - Agency In-Home';
    }
    if (management_mode === 'AGENCY_MANAGED' && care_setting === 'FACILITY') {
      return 'E) AGENCY_FACILITY - Agency Facility';
    }
    return 'Unknown Scenario';
  };

  const getGovernanceText = () => {
    const { management_mode, supervision_enabled, agency_id } = context;

    if (management_mode === 'SELF') {
      return 'Work: Senior | Supervision: Family';
    }
    if (management_mode === 'FAMILY_MANAGED' && !agency_id) {
      return 'Work: Senior/Caregiver | Supervision: Family';
    }
    if (management_mode === 'AGENCY_MANAGED' && supervision_enabled) {
      return 'Work: Caregivers | Supervision: Agency Supervisors';
    }
    return 'Mixed governance';
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-900">
              Active Scenario:
            </span>
          </div>
          <span className="text-sm font-bold text-blue-700">
            {getScenarioLabel()}
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-blue-800">
          <div>
            <span className="font-semibold">Mode: </span>
            {context.management_mode}
          </div>
          <div>
            <span className="font-semibold">Setting: </span>
            {context.care_setting}
          </div>
          <div>
            <span className="font-semibold">Model: </span>
            {context.service_model}
          </div>
          <div>
            <span className="font-semibold">Governance: </span>
            {getGovernanceText()}
          </div>
        </div>
      </div>
    </div>
  );
}
