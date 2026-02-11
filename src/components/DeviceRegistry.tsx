import { useState, useEffect } from 'react';
import { useDeviceManagement } from '../hooks/useDeviceManagement';

interface Props {
  residentId: string;
  residentName: string;
  onPairDevice: () => void;
}

interface Device {
  id: string;
  device_id: string;
  device_type: string;
  device_name: string;
  manufacturer: string;
  model: string;
  firmware_version: string;
  battery_level: number;
  trust_state: string;
  last_seen_at: string;
  pairing_timestamp: string;
  is_revoked: boolean;
  requires_attention: boolean;
  seconds_since_seen: number;
}

const TRUST_STATE_COLORS = {
  TRUSTED: 'bg-green-100 text-green-800 border-green-300',
  LOW_BATTERY: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  OFFLINE: 'bg-red-100 text-red-800 border-red-300',
  UNRELIABLE: 'bg-orange-100 text-orange-800 border-orange-300',
  REVOKED: 'bg-gray-100 text-gray-800 border-gray-300'
};

const TRUST_STATE_ICONS = {
  TRUSTED: '✓',
  LOW_BATTERY: '⚠',
  OFFLINE: '✕',
  UNRELIABLE: '!',
  REVOKED: '⊘'
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
  BLE_HEALTH_SENSOR: 'BLE Health Sensor',
  WIFI_FALL_DETECTION: 'Wi-Fi Fall Detection',
  GPS_TRACKER: 'GPS Tracker',
  ENVIRONMENTAL_SENSOR: 'Environmental Sensor',
  EMERGENCY_BUTTON: 'Emergency Button'
};

export function DeviceRegistry({ residentId, residentName, onPairDevice }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const { getResidentDevices, revokeDevice } = useDeviceManagement();

  useEffect(() => {
    loadDevices();
  }, [residentId]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getResidentDevices(residentId);
      setDevices(result.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeDevice = async () => {
    if (!selectedDevice || !revokeReason.trim()) return;

    try {
      await revokeDevice(selectedDevice.device_id, revokeReason);
      setShowRevokeModal(false);
      setRevokeReason('');
      setSelectedDevice(null);
      loadDevices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke device');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatSecondsAgo = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading devices...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Device Registry</h2>
          <p className="text-gray-600">{residentName}</p>
        </div>
        <button
          onClick={onPairDevice}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
        >
          + Pair New Device
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {devices.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No devices paired yet</p>
          <p className="text-sm">Click "Pair New Device" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`border-2 rounded-lg p-4 ${
                device.requires_attention ? 'border-yellow-400' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{device.device_name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        TRUST_STATE_COLORS[device.trust_state as keyof typeof TRUST_STATE_COLORS]
                      }`}
                    >
                      {TRUST_STATE_ICONS[device.trust_state as keyof typeof TRUST_STATE_ICONS]} {device.trust_state}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {DEVICE_TYPE_LABELS[device.device_type] || device.device_type}
                  </p>
                  <p className="text-xs text-gray-500">
                    {device.manufacturer} {device.model} • ID: {device.device_id}
                  </p>
                </div>
                {!device.is_revoked && (
                  <button
                    onClick={() => {
                      setSelectedDevice(device);
                      setShowRevokeModal(true);
                    }}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Revoke
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Battery:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          device.battery_level > 50
                            ? 'bg-green-500'
                            : device.battery_level > 20
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${device.battery_level}%` }}
                      />
                    </div>
                    <span className="font-medium">{device.battery_level}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-600">Last Seen:</span>
                  <p className="font-medium">{formatSecondsAgo(device.seconds_since_seen)}</p>
                </div>

                <div>
                  <span className="text-gray-600">Firmware:</span>
                  <p className="font-medium">{device.firmware_version}</p>
                </div>

                <div>
                  <span className="text-gray-600">Paired:</span>
                  <p className="font-medium">{formatTimestamp(device.pairing_timestamp)}</p>
                </div>
              </div>

              {device.requires_attention && !device.is_revoked && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠ This device requires attention
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {device.trust_state === 'LOW_BATTERY' && 'Battery level is low. Replace or recharge soon.'}
                    {device.trust_state === 'OFFLINE' && 'Device has not reported in over 1 hour. Check connectivity.'}
                    {device.trust_state === 'UNRELIABLE' && 'Device data is unreliable. Check device health.'}
                  </p>
                </div>
              )}

              {device.is_revoked && (
                <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-sm text-gray-800 font-medium">
                    Device revoked. Data is rejected.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRevokeModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Revoke Device</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to permanently revoke device: <strong>{selectedDevice.device_name}</strong>
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-red-800 font-semibold">⚠ WARNING</p>
              <p className="text-xs text-red-700 mt-1">
                This action is PERMANENT. Revoked devices cannot be re-trusted and all data from this device will be rejected.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Revocation Reason *
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                rows={3}
                placeholder="Enter reason for revocation..."
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevokeReason('');
                  setSelectedDevice(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeDevice}
                disabled={!revokeReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 rounded font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Revoke Device
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
