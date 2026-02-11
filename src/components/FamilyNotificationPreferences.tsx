import { useState, useEffect } from 'react';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';

interface Props {
  residentId: string;
  residentName: string;
}

export function FamilyNotificationPreferences({ residentId, residentName }: Props) {
  const [prefs, setPrefs] = useState({
    quietHoursStart: '',
    quietHoursEnd: '',
    channelInApp: true,
    channelPush: true,
    channelSms: false,
    channelEmail: false,
    summaryFrequency: 'DAILY'
  });

  const [agencyPolicy, setAgencyPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const { getFamilyNotificationPreferences, updateFamilyNotificationPreferences } = useNotificationPreferences();

  useEffect(() => {
    loadPreferences();
  }, [residentId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await getFamilyNotificationPreferences(residentId);

      if (data) {
        setPrefs({
          quietHoursStart: data.quiet_hours_start || '',
          quietHoursEnd: data.quiet_hours_end || '',
          channelInApp: data.channel_in_app ?? true,
          channelPush: data.channel_push ?? true,
          channelSms: data.channel_sms ?? false,
          channelEmail: data.channel_email ?? false,
          summaryFrequency: data.summary_frequency || 'DAILY'
        });
        setAgencyPolicy(data.agency_policy);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const result = await updateFamilyNotificationPreferences({
        residentId,
        quietHoursStart: prefs.quietHoursStart || undefined,
        quietHoursEnd: prefs.quietHoursEnd || undefined,
        channelInApp: prefs.channelInApp,
        channelPush: prefs.channelPush,
        channelSms: prefs.channelSms,
        channelEmail: prefs.channelEmail,
        summaryFrequency: prefs.summaryFrequency
      });

      if (result.policy_violations && result.policy_violations.length > 0) {
        setMessage({
          type: 'warning',
          text: `Settings saved with policy overrides: ${result.policy_violations.join(', ')}`
        });
      } else {
        setMessage({ type: 'success', text: 'Notification preferences saved successfully' });
      }

      loadPreferences();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div data-testid="notifications-preferences" className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-2">Notification Preferences</h2>
      <p className="text-gray-600 mb-6">{residentName}</p>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : message.type === 'warning'
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3">Quiet Hours</h3>
          {agencyPolicy && !agencyPolicy.allow_quiet_hours ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm text-yellow-800 font-semibold">Policy Restriction:</p>
              <p className="text-sm text-yellow-800">
                Your organization does not allow quiet hours. All notifications will be delivered immediately.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">
                During quiet hours, only EMERGENCY and CRITICAL alerts will be delivered.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => setPrefs({...prefs, quietHoursStart: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => setPrefs({...prefs, quietHoursEnd: e.target.value})}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3">Notification Channels</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">In-App Notifications</div>
                <div className="text-sm text-gray-600">Notifications within the app</div>
              </div>
              <button
                onClick={() => setPrefs({...prefs, channelInApp: !prefs.channelInApp})}
                className={`w-14 h-7 rounded-full transition-colors ${
                  prefs.channelInApp ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  prefs.channelInApp ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-gray-600">Mobile and desktop push alerts</div>
              </div>
              <button
                onClick={() => setPrefs({...prefs, channelPush: !prefs.channelPush})}
                className={`w-14 h-7 rounded-full transition-colors ${
                  prefs.channelPush ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  prefs.channelPush ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">SMS Notifications</div>
                <div className="text-sm text-gray-600">Text message alerts</div>
              </div>
              <button
                onClick={() => setPrefs({...prefs, channelSms: !prefs.channelSms})}
                className={`w-14 h-7 rounded-full transition-colors ${
                  prefs.channelSms ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  prefs.channelSms ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-gray-600">Non-critical alerts only</div>
              </div>
              <button
                onClick={() => setPrefs({...prefs, channelEmail: !prefs.channelEmail})}
                className={`w-14 h-7 rounded-full transition-colors ${
                  prefs.channelEmail ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  prefs.channelEmail ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-3">Summary Frequency</h3>
          <div className="grid grid-cols-3 gap-3">
            {['DAILY', 'WEEKLY', 'NONE'].map(freq => (
              <button
                key={freq}
                onClick={() => setPrefs({...prefs, summaryFrequency: freq})}
                className={`p-3 border-2 rounded-lg font-semibold ${
                  prefs.summaryFrequency === freq
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-sm text-red-800 font-semibold">Emergency Alerts:</p>
          <p className="text-sm text-red-800 mt-1">
            EMERGENCY and CRITICAL alerts will always be delivered immediately through multiple channels. These settings cannot suppress safety-critical notifications.
          </p>
          {agencyPolicy && (
            <div className="mt-3 text-xs text-red-700">
              <p className="font-semibold">Agency Policy:</p>
              <p>Emergency Channels: {agencyPolicy.emergency_channels?.join(', ')}</p>
              <p>Critical Channels: {agencyPolicy.critical_channels?.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
