import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

function generateUUID(): string {
  return crypto.randomUUID();
}

export const FamilySettingsPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateUUID());

  const [dailySummary, setDailySummary] = useState(true);
  const [medicationUpdates, setMedicationUpdates] = useState(true);
  const [healthAlerts, setHealthAlerts] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSms, setChannelSms] = useState(false);
  const [channelInApp, setChannelInApp] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, [isShowcaseMode]);

  const loadPreferences = async () => {
    setLoading(true);
    const userId = '00000000-0000-0000-0000-000000000002';
    const residentId = '00000000-0000-0000-0000-000000000010';

    const { data, error } = await supabase.rpc('get_family_notification_preferences', {
      p_user_id: userId,
      p_resident_id: residentId,
    });

    if (!error && data) {
      setDailySummary(data.daily_summary_enabled);
      setMedicationUpdates(data.medication_updates_enabled);
      setHealthAlerts(data.health_alerts_enabled);
      setAppointmentReminders(data.appointment_reminders_enabled);
      setChannelEmail(data.channel_email);
      setChannelSms(data.channel_sms);
      setChannelInApp(data.channel_in_app);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const userId = '00000000-0000-0000-0000-000000000002';
    const residentId = '00000000-0000-0000-0000-000000000010';

    const { data, error } = await supabase.rpc('update_family_notification_preferences_with_idempotency', {
      p_user_id: userId,
      p_resident_id: residentId,
      p_daily_summary: dailySummary,
      p_medication_updates: medicationUpdates,
      p_health_alerts: healthAlerts,
      p_appointment_reminders: appointmentReminders,
      p_channel_email: channelEmail,
      p_channel_sms: channelSms,
      p_channel_in_app: channelInApp,
      p_idempotency_key: idempotencyKey,
      p_is_simulation: isShowcaseMode,
    });

    if (!error) {
      setIdempotencyKey(generateUUID());
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h1>
        <p className="text-gray-600">Manage how you receive updates about your loved one's care</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={dailySummary}
                onChange={(e) => setDailySummary(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Daily Summary</div>
                <div className="text-sm text-gray-600">Receive a daily summary of care activities</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={medicationUpdates}
                onChange={(e) => setMedicationUpdates(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Medication Updates</div>
                <div className="text-sm text-gray-600">Get notified when medications are administered</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={healthAlerts}
                onChange={(e) => setHealthAlerts(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Health Alerts</div>
                <div className="text-sm text-gray-600">Immediate alerts for health concerns or incidents</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={appointmentReminders}
                onChange={(e) => setAppointmentReminders(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Appointment Reminders</div>
                <div className="text-sm text-gray-600">Reminders for upcoming medical appointments</div>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={channelInApp}
                onChange={(e) => setChannelInApp(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">In-App Notifications</div>
                <div className="text-sm text-gray-600">Receive notifications within the app</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={channelEmail}
                onChange={(e) => setChannelEmail(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Email Notifications</div>
                <div className="text-sm text-gray-600">Receive notifications via email</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={channelSms}
                onChange={(e) => setChannelSms(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">SMS Notifications</div>
                <div className="text-sm text-gray-600">Receive text messages for urgent updates</div>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
          >
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
