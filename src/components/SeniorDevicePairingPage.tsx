import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSeniorResident } from '../hooks/useSeniorResident';
import { useShowcase } from '../contexts/ShowcaseContext';

interface DeviceTemplate {
  manufacturer: string;
  model: string;
  deviceClass: string;
  syncMethod: string;
  supportedMetrics: string[];
}

const DEVICE_TEMPLATES: DeviceTemplate[] = [
  {
    manufacturer: 'Apple',
    model: 'Apple Watch Series 9',
    deviceClass: 'ADVANCED_CONSUMER',
    syncMethod: 'COMPANION_APP',
    supportedMetrics: ['heart_rate', 'hrv', 'ecg', 'spo2', 'steps', 'sleep_duration', 'afib_detected']
  },
  {
    manufacturer: 'Fitbit',
    model: 'Fitbit Sense 2',
    deviceClass: 'ADVANCED_CONSUMER',
    syncMethod: 'CLOUD_API',
    supportedMetrics: ['heart_rate', 'hrv', 'spo2', 'steps', 'sleep_duration', 'stress_score', 'skin_temp']
  },
  {
    manufacturer: 'Omron',
    model: 'Omron Evolv',
    deviceClass: 'MEDICAL_GRADE',
    syncMethod: 'BLUETOOTH_BLE',
    supportedMetrics: ['systolic', 'diastolic', 'heart_rate']
  },
  {
    manufacturer: 'Withings',
    model: 'Body+ Scale',
    deviceClass: 'ADVANCED_CONSUMER',
    syncMethod: 'CLOUD_API',
    supportedMetrics: ['weight', 'body_fat', 'heart_rate']
  },
  {
    manufacturer: 'Garmin',
    model: 'Vivosmart 5',
    deviceClass: 'PERSONAL_CONSUMER',
    syncMethod: 'COMPANION_APP',
    supportedMetrics: ['heart_rate', 'steps', 'sleep_duration', 'stress_score', 'spo2']
  }
];

export function SeniorDevicePairingPage() {
  const { resident: authResident, loading: authLoading } = useSeniorResident();
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [showcaseResident, setShowcaseResident] = useState<any>(null);
  const [showcaseLoading, setShowcaseLoading] = useState(true);
  const [pairedDevices, setPairedDevices] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairingSuccess, setPairingSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isShowcaseMode && selectedResidentId) {
      setShowcaseLoading(true);
      supabase
        .from('residents')
        .select('*')
        .eq('id', selectedResidentId)
        .maybeSingle()
        .then(({ data }) => {
          setShowcaseResident(data);
          setShowcaseLoading(false);
        })
        .catch(() => setShowcaseLoading(false));
    }
  }, [isShowcaseMode, selectedResidentId]);

  const resident = isShowcaseMode ? showcaseResident : authResident;
  const residentLoading = isShowcaseMode ? showcaseLoading : authLoading;

  useEffect(() => {
    if (resident?.id && !residentLoading) {
      loadPairedDevices(resident.id);
    }
  }, [resident?.id, residentLoading]);

  const loadPairedDevices = async (resId: string) => {
    const { data: devices } = await supabase
      .from('device_registry')
      .select(`
        *,
        wearable_devices(*)
      `)
      .eq('resident_id', resId)
      .eq('trust_state', 'TRUSTED');

    setPairedDevices(devices || []);
  };

  const handlePairDevice = async () => {
    if (!selectedTemplate || !deviceId || !deviceName || !resident?.id) {
      setError('Please fill in all fields');
      return;
    }

    setIsPairing(true);
    setError(null);

    try {
      const { data, error: pairError } = await supabase.rpc('pair_wearable_device', {
        p_resident_id: resident.id,
        p_device_id: deviceId,
        p_device_type: 'BLE_HEALTH_SENSOR',
        p_device_name: deviceName,
        p_manufacturer: selectedTemplate.manufacturer,
        p_model: selectedTemplate.model,
        p_firmware_version: '1.0.0',
        p_device_class: selectedTemplate.deviceClass,
        p_sync_method: selectedTemplate.syncMethod,
        p_supported_metrics: selectedTemplate.supportedMetrics
      });

      if (pairError) throw pairError;

      setPairingSuccess(true);
      setDeviceId('');
      setDeviceName('');
      setSelectedTemplate(null);

      await loadPairedDevices(resident.id);

      setTimeout(() => setPairingSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPairing(false);
    }
  };

  if (residentLoading || !resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Health Devices</h1>
          <p className="text-gray-600">Connect your wearables and health monitors</p>
        </div>

        {pairingSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">Device paired successfully!</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pair New Device</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Device
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedTemplate?.model || ''}
                  onChange={(e) => {
                    const template = DEVICE_TEMPLATES.find(t => t.model === e.target.value);
                    setSelectedTemplate(template || null);
                  }}
                >
                  <option value="">Choose a device...</option>
                  {DEVICE_TEMPLATES.map(template => (
                    <option key={template.model} value={template.model}>
                      {template.manufacturer} {template.model}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Device Capabilities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.supportedMetrics.map(metric => (
                        <span
                          key={metric}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {metric.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-blue-700">
                      Sync Method: {selectedTemplate.syncMethod.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device Name (Your Choice)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="My Apple Watch"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Device ID (Serial Number or MAC Address)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="XX:XX:XX:XX:XX:XX"
                      value={deviceId}
                      onChange={(e) => setDeviceId(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handlePairDevice}
                    disabled={isPairing || !deviceId || !deviceName}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPairing ? 'Pairing Device...' : 'Pair Device'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Paired Devices</h2>

            {pairedDevices.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <p className="text-gray-500">No devices paired yet</p>
                <p className="text-sm text-gray-400 mt-1">Pair a device to start tracking your health</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pairedDevices.map(device => (
                  <div
                    key={device.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{device.device_name}</h3>
                        <p className="text-sm text-gray-600">
                          {device.manufacturer} {device.model}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {device.trust_state}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {device.battery_level}%
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(device.last_seen_at).toLocaleTimeString()}
                      </div>
                    </div>

                    {device.wearable_devices && device.wearable_devices.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Supported Metrics:</p>
                        <div className="flex flex-wrap gap-1">
                          {(device.wearable_devices[0].supported_metrics || []).slice(0, 5).map((metric: string) => (
                            <span
                              key={metric}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {metric.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {(device.wearable_devices[0].supported_metrics || []).length > 5 && (
                            <span className="px-2 py-0.5 text-gray-500 text-xs">
                              +{(device.wearable_devices[0].supported_metrics || []).length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}