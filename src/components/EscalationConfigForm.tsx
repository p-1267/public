import { useState } from 'react';

interface Props {
  agencyId: string;
  onSave: (config: any) => Promise<any>;
  onError: (error: string | null) => void;
}

const ESCALATION_LEVELS = [
  { key: 'assigned_caregiver', label: 'Assigned Caregiver' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'agency_admin', label: 'Agency Administrator' },
  { key: 'emergency_services', label: 'Emergency Services (911)' }
];

const NOTIFICATION_CHANNELS = [
  { key: 'in_app', label: 'In-App Notification', icon: '🔔' },
  { key: 'sms', label: 'SMS Text Message', icon: '📱' },
  { key: 'email', label: 'Email', icon: '📧' },
  { key: 'push', label: 'Push Notification', icon: '📲' },
  { key: 'phone_call', label: 'Phone Call', icon: '📞' }
];

export function EscalationConfigForm({ onSave, onError }: Props) {
  const [escalationOrder, setEscalationOrder] = useState(
    ESCALATION_LEVELS.map(level => level.key)
  );
  const [timeouts, setTimeouts] = useState<Record<string, number>>({
    assigned_caregiver: 5,
    supervisor: 10,
    agency_admin: 15,
    emergency_services: 0
  });
  const [channels, setChannels] = useState<string[]>(['in_app', 'sms', 'email']);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [saving, setSaving] = useState(false);

  const handleToggleChannel = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    if (channels.length === 0) {
      onError('At least one notification channel must be selected');
      return;
    }

    const config = {
      escalationOrder: escalationOrder,
      timeoutDurations: timeouts,
      notificationChannels: channels,
      quietHoursStart,
      quietHoursEnd
    };

    try {
      setSaving(true);
      await onSave(config);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save escalation configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          State 5: Escalation & Notification Baselines
        </h2>
        <p className="text-gray-600">
          Configure escalation chains, timeout durations, and notification preferences.
        </p>
      </div>

      <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Emergency Override</h3>
            <p className="text-sm text-red-800">
              Emergency alerts <strong>IGNORE quiet hours</strong> and will always be delivered immediately.
              No module may bypass this baseline.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Escalation Order</h3>
          <p className="text-sm text-gray-600 mb-4">
            Incidents will escalate through these levels in order, based on timeout durations.
          </p>
          <div className="space-y-3">
            {escalationOrder.map((levelKey, index) => {
              const level = ESCALATION_LEVELS.find(l => l.key === levelKey);
              if (!level) return null;

              return (
                <div key={levelKey} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{level.label}</p>
                    {levelKey !== 'emergency_services' && (
                      <p className="text-sm text-gray-600">
                        Timeout: {timeouts[levelKey]} minutes
                      </p>
                    )}
                  </div>
                  {levelKey !== 'emergency_services' && (
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-700">Timeout (minutes):</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={timeouts[levelKey]}
                        onChange={(e) => setTimeouts({
                          ...timeouts,
                          [levelKey]: parseInt(e.target.value) || 0
                        })}
                        className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            If no acknowledgment is received within the timeout, the incident escalates to the next level.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h3>
          <p className="text-sm text-gray-600 mb-4">
            Select which channels can be used for notifications. Users can choose their preferences from these options.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NOTIFICATION_CHANNELS.map(channel => (
              <label
                key={channel.key}
                className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                  channels.includes(channel.key)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={channels.includes(channel.key)}
                  onChange={() => handleToggleChannel(channel.key)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-2xl">{channel.icon}</span>
                <span className="font-medium text-gray-900">{channel.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiet Hours</h3>
          <p className="text-sm text-gray-600 mb-4">
            Non-emergency notifications will respect these quiet hours. Emergency alerts always override.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiet Hours Start
              </label>
              <input
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiet Hours End
              </label>
              <input
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Emergency alerts will ALWAYS be delivered immediately,
              regardless of quiet hours settings.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Enforcement Rules</h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Escalation order cannot be bypassed</li>
            <li>Timeout durations are strictly enforced</li>
            <li>Emergency notifications ignore quiet hours</li>
            <li>All escalations are audited</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save & Continue to State 6'}
          </button>
        </div>
      </form>
    </div>
  );
}
