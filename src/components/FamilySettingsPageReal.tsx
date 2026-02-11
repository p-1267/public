import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface NotificationPreferences {
  daily_summary_enabled: boolean;
  medication_updates_enabled: boolean;
  health_alerts_enabled: boolean;
  appointment_reminders_enabled: boolean;
  incident_alerts_enabled: boolean;
  emergency_only: boolean;
  delivery_method: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

interface ContactInfo {
  email: string;
  phone_number: string | null;
  preferred_contact_time: string | null;
}

export const FamilySettingsPageReal: React.FC = () => {
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    daily_summary_enabled: true,
    medication_updates_enabled: true,
    health_alerts_enabled: true,
    appointment_reminders_enabled: true,
    incident_alerts_enabled: true,
    emergency_only: false,
    delivery_method: 'EMAIL',
    quiet_hours_start: null,
    quiet_hours_end: null,
  });

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone_number: '',
    preferred_contact_time: 'ANYTIME',
  });

  const [relationship, setRelationship] = useState<string>('CHILD');
  const [isEmergencyContact, setIsEmergencyContact] = useState(false);
  const [isMedicalDecisionMaker, setIsMedicalDecisionMaker] = useState(false);

  const [residentId, setResidentId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedResidentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      let userId: string | null = null;
      let linkResidentId: string | null = null;

      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        userId = user.id;

        const { data: linkData } = await supabase
          .from('family_resident_links')
          .select('resident_id, relationship')
          .eq('family_user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (!linkData) {
          setLoading(false);
          return;
        }

        linkResidentId = linkData.resident_id;
        setResidentId(linkResidentId);
        setRelationship(linkData.relationship || 'CHILD');

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('email, phone_number')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          setContactInfo({
            email: profileData.email || '',
            phone_number: profileData.phone_number || '',
            preferred_contact_time: 'ANYTIME',
          });
        }
      } else {
        userId = 'showcase-family-user';
        linkResidentId = selectedResidentId || null;
        setResidentId(linkResidentId);
      }

      if (userId && linkResidentId) {
        const { data: prefsData } = await supabase
          .from('family_notification_preferences')
          .select('*')
          .eq('family_user_id', userId)
          .eq('resident_id', linkResidentId)
          .maybeSingle();

        if (prefsData) {
          setPreferences({
            daily_summary_enabled: prefsData.daily_summary_enabled ?? true,
            medication_updates_enabled: prefsData.medication_updates_enabled ?? true,
            health_alerts_enabled: prefsData.health_alerts_enabled ?? true,
            appointment_reminders_enabled: prefsData.appointment_reminders_enabled ?? true,
            incident_alerts_enabled: prefsData.incident_alerts_enabled ?? true,
            emergency_only: prefsData.emergency_only ?? false,
            delivery_method: prefsData.delivery_method || 'EMAIL',
            quiet_hours_start: prefsData.quiet_hours_start,
            quiet_hours_end: prefsData.quiet_hours_end,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setErrorMessage('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !residentId) {
        throw new Error('User or resident not found');
      }

      await supabase
        .from('family_notification_preferences')
        .upsert({
          family_user_id: user.id,
          resident_id: residentId,
          ...preferences,
        }, {
          onConflict: 'family_user_id,resident_id'
        });

      await supabase
        .from('user_profiles')
        .update({
          phone_number: contactInfo.phone_number,
        })
        .eq('user_id', user.id);

      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrorMessage('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!residentId) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-2">No resident link found</p>
          <p className="text-gray-500">Please contact your care coordinator to set up access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your notification preferences and account settings</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
            <p className="text-sm text-gray-600 mb-6">Choose what updates you want to receive about your loved one.</p>

            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.daily_summary_enabled}
                  onChange={(e) => setPreferences({...preferences, daily_summary_enabled: e.target.checked})}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Daily Summary</div>
                  <div className="text-sm text-gray-600">Receive a daily summary of care activities</div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.medication_updates_enabled}
                  onChange={(e) => setPreferences({...preferences, medication_updates_enabled: e.target.checked})}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Medication Updates</div>
                  <div className="text-sm text-gray-600">Notify me when medications are given</div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.health_alerts_enabled}
                  onChange={(e) => setPreferences({...preferences, health_alerts_enabled: e.target.checked})}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Health Alerts</div>
                  <div className="text-sm text-gray-600">Alert me about concerning health changes</div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.appointment_reminders_enabled}
                  onChange={(e) => setPreferences({...preferences, appointment_reminders_enabled: e.target.checked})}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Appointment Reminders</div>
                  <div className="text-sm text-gray-600">Remind me about upcoming appointments</div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.incident_alerts_enabled}
                  onChange={(e) => setPreferences({...preferences, incident_alerts_enabled: e.target.checked})}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Incident Alerts</div>
                  <div className="text-sm text-gray-600">Notify me about falls, wandering, or safety concerns</div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.emergency_only}
                  onChange={(e) => setPreferences({...preferences, emergency_only: e.target.checked})}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">Emergency Only</div>
                  <div className="text-sm text-gray-600">Only notify me about emergencies</div>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Notification Method
                </label>
                <select
                  value={preferences.delivery_method}
                  onChange={(e) => setPreferences({...preferences, delivery_method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="BOTH">Both Email and SMS</option>
                  <option value="IN_APP">In-app only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiet Hours Start (Optional)
                  </label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_start || ''}
                    onChange={(e) => setPreferences({...preferences, quiet_hours_start: e.target.value || null})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiet Hours End (Optional)
                  </label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_end || ''}
                    onChange={(e) => setPreferences({...preferences, quiet_hours_end: e.target.value || null})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <p className="text-sm text-gray-600 mb-6">Keep your contact information up to date.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                  placeholder="your.email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500">Email address cannot be changed here. Contact support to update.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={contactInfo.phone_number || ''}
                  onChange={(e) => setContactInfo({...contactInfo, phone_number: e.target.value})}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Contact Time
                </label>
                <select
                  value={contactInfo.preferred_contact_time || 'ANYTIME'}
                  onChange={(e) => setContactInfo({...contactInfo, preferred_contact_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="MORNING">Morning (8am-12pm)</option>
                  <option value="AFTERNOON">Afternoon (12pm-5pm)</option>
                  <option value="EVENING">Evening (5pm-8pm)</option>
                  <option value="ANYTIME">Anytime</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Relationship Information</h2>
            <p className="text-sm text-gray-600 mb-6">This helps the care team understand your role.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your relationship
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled
                >
                  <option value="SPOUSE">Spouse</option>
                  <option value="CHILD">Child</option>
                  <option value="SIBLING">Sibling</option>
                  <option value="OTHER_FAMILY">Other Family</option>
                  <option value="FRIEND">Friend</option>
                  <option value="LEGAL_GUARDIAN">Legal Guardian</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Contact the care coordinator to change your relationship designation.</p>
              </div>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isEmergencyContact}
                  onChange={(e) => setIsEmergencyContact(e.target.checked)}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                  disabled
                />
                <div>
                  <div className="font-medium text-gray-900">I am an emergency contact</div>
                  <div className="text-sm text-gray-600">Contact the care coordinator to update emergency contact status</div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isMedicalDecisionMaker}
                  onChange={(e) => setIsMedicalDecisionMaker(e.target.checked)}
                  className="mt-1 h-5 w-5 text-blue-600 rounded"
                  disabled
                />
                <div>
                  <div className="font-medium text-gray-900">I have medical power of attorney</div>
                  <div className="text-sm text-gray-600">Contact the care coordinator to update legal authority information</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => loadData()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
