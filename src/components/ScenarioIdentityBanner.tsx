import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
  const [context, setContext] = useState<CareContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCareContext();
  }, [residentId]);

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
        setContext(data);
      }
      setLoading(false);
    } catch (err) {
      console.error('[ScenarioIdentityBanner] Exception:', err);
      setLoading(false);
    }
  };

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
