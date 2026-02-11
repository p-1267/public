import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface AgencySettings {
  agency_name: string;
  license_number: string;
  address: string;
  primary_phone: string;
  emergency_phone: string;
  default_shift_length: string;
  max_residents_per_caregiver: number;
  medication_window_minutes: number;
  alert_escalation_minutes: number;
}

export const AgencySettingsPage: React.FC = () => {
  const { isShowcaseMode, showcaseAgencyId } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AgencySettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, [showcaseAgencyId, isShowcaseMode]);

  const loadSettings = async () => {
    if (!showcaseAgencyId) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('get_agency_settings', {
      p_agency_id: showcaseAgencyId,
      p_include_simulation: isShowcaseMode,
    });

    if (!error && data) {
      setSettings(data);
    }
    setLoading(false);
  };

  if (loading || !settings) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Agency Settings</h1>
        <p className="text-gray-600">Configure agency-wide operational parameters</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agency Information</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agency Name</label>
              <input
                type="text"
                value={settings.agency_name || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input
                type="text"
                value={settings.license_number || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={settings.address || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Phone</label>
                <input
                  type="text"
                  value={settings.primary_phone || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Phone</label>
                <input
                  type="text"
                  value={settings.emergency_phone || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Operational Settings</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Shift Length</label>
              <input
                type="text"
                value={settings.default_shift_length}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Residents per Caregiver</label>
                <input
                  type="number"
                  value={settings.max_residents_per_caregiver}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medication Window (minutes)</label>
                <input
                  type="number"
                  value={settings.medication_window_minutes}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Escalation Time (minutes)</label>
              <input
                type="number"
                value={settings.alert_escalation_minutes}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {isShowcaseMode && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Showcase Mode:</strong> In production, you can edit these settings and configure additional operational parameters.
          </p>
        </div>
      )}
    </div>
  );
};
