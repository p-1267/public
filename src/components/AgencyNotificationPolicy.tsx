import { useState, useEffect } from 'react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';

export function AgencyNotificationPolicy() {
  const [policy, setPolicy] = useState({
    mandatoryAlertTypes: ['EMERGENCY', 'CRITICAL'],
    emergencyChannels: ['IN_APP', 'PUSH', 'SMS'],
    criticalChannels: ['IN_APP', 'PUSH'],
    allowQuietHours: false,
    maxSuppressionHours: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getAgencyNotificationPolicy, updateAgencyNotificationPolicy } = useNotificationPreferences();

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const data = await getAgencyNotificationPolicy();

      if (data) {
        setPolicy({
          mandatoryAlertTypes: data.mandatory_alert_types || ['EMERGENCY', 'CRITICAL'],
          emergencyChannels: data.emergency_channels || ['IN_APP', 'PUSH', 'SMS'],
          criticalChannels: data.critical_channels || ['IN_APP', 'PUSH'],
          allowQuietHours: data.allow_quiet_hours ?? false,
          maxSuppressionHours: data.max_suppression_hours ?? 0
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load policy' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      await updateAgencyNotificationPolicy({
        mandatoryAlertTypes: policy.mandatoryAlertTypes,
        emergencyChannels: policy.emergencyChannels,
        criticalChannels: policy.criticalChannels,
        allowQuietHours: policy.allowQuietHours,
        maxSuppressionHours: policy.maxSuppressionHours
      });

      setMessage({ type: 'success', text: 'Agency policy updated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save policy' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAlertType = (alertType: string) => {
    setPolicy({
      ...policy,
      mandatoryAlertTypes: policy.mandatoryAlertTypes.includes(alertType)
        ? policy.mandatoryAlertTypes.filter(t => t !== alertType)
        : [...policy.mandatoryAlertTypes, alertType]
    });
  };

  const toggleEmergencyChannel = (channel: string) => {
    setPolicy({
      ...policy,
      emergencyChannels: policy.emergencyChannels.includes(channel)
        ? policy.emergencyChannels.filter(c => c !== channel)
        : [...policy.emergencyChannels, channel]
    });
  };

  const toggleCriticalChannel = (channel: string) => {
    setPolicy({
      ...policy,
      criticalChannels: policy.criticalChannels.includes(channel)
        ? policy.criticalChannels.filter(c => c !== channel)
        : [...policy.criticalChannels, channel]
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading policy...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-2">Agency Notification Policy</h2>
      <p className="text-gray-600 mb-6">
        Configure organization-wide notification rules that override user preferences
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <p className="text-sm text-yellow-800 font-semibold">Policy Authority:</p>
        <p className="text-sm text-yellow-800 mt-1">
          These settings override all user preferences for safety and compliance. Changes apply to all users immediately.
        </p>
      </div>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3">Mandatory Alert Types</h3>
          <p className="text-sm text-gray-600 mb-3">
            Alert types that cannot be suppressed by user preferences
          </p>
          <div className="space-y-2">
            {['EMERGENCY', 'CRITICAL', 'IMPORTANT', 'INFORMATIONAL'].map(alertType => (
              <div key={alertType} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{alertType}</div>
                  <div className="text-xs text-gray-600">
                    {alertType === 'EMERGENCY' && 'Life-threatening situations'}
                    {alertType === 'CRITICAL' && 'Urgent care needs'}
                    {alertType === 'IMPORTANT' && 'Significant updates'}
                    {alertType === 'INFORMATIONAL' && 'General information'}
                  </div>
                </div>
                <button
                  onClick={() => toggleAlertType(alertType)}
                  disabled={alertType === 'EMERGENCY'}
                  className={`px-4 py-2 rounded font-semibold ${
                    policy.mandatoryAlertTypes.includes(alertType)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  } ${alertType === 'EMERGENCY' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {policy.mandatoryAlertTypes.includes(alertType) ? 'Mandatory' : 'Optional'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">EMERGENCY alerts are always mandatory</p>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3">Emergency Alert Channels</h3>
          <p className="text-sm text-gray-600 mb-3">
            Channels forced for EMERGENCY notifications
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['IN_APP', 'PUSH', 'SMS', 'EMAIL'].map(channel => (
              <button
                key={channel}
                onClick={() => toggleEmergencyChannel(channel)}
                className={`p-3 border-2 rounded-lg font-semibold ${
                  policy.emergencyChannels.includes(channel)
                    ? 'border-red-600 bg-red-50 text-red-800'
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                {channel.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3">Critical Alert Channels</h3>
          <p className="text-sm text-gray-600 mb-3">
            Channels forced for CRITICAL notifications
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['IN_APP', 'PUSH', 'SMS', 'EMAIL'].map(channel => (
              <button
                key={channel}
                onClick={() => toggleCriticalChannel(channel)}
                className={`p-3 border-2 rounded-lg font-semibold ${
                  policy.criticalChannels.includes(channel)
                    ? 'border-orange-600 bg-orange-50 text-orange-800'
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                {channel.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Allow Quiet Hours</h3>
              <p className="text-sm text-gray-600">
                Whether users can set quiet hours for non-emergency alerts
              </p>
            </div>
            <button
              onClick={() => setPolicy({...policy, allowQuietHours: !policy.allowQuietHours})}
              className={`w-16 h-8 rounded-full transition-colors ${
                policy.allowQuietHours ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                policy.allowQuietHours ? 'translate-x-9' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3">Maximum Suppression Hours</h3>
          <p className="text-sm text-gray-600 mb-3">
            Maximum hours non-emergency alerts can be suppressed (0 = no suppression)
          </p>
          <input
            type="number"
            min="0"
            max="24"
            value={policy.maxSuppressionHours}
            onChange={(e) => setPolicy({...policy, maxSuppressionHours: parseInt(e.target.value)})}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div className="border-t pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Agency Policy'}
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-sm text-red-800 font-semibold">Important:</p>
          <p className="text-sm text-red-800 mt-1">
            Policy changes apply immediately to all users in your organization. Emergency alerts will always be delivered through all configured channels regardless of user preferences.
          </p>
        </div>
      </div>
    </div>
  );
}
