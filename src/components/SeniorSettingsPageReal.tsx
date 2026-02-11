import React, { useState, useEffect } from 'react';
import { useSeniorResident } from '../hooks/useSeniorResident';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';
import { SeniorOperatingModeSwitcher } from './SeniorOperatingModeSwitcher';
import { useShowcase } from '../contexts/ShowcaseContext';
import { supabase } from '../lib/supabase';

export const SeniorSettingsPageReal: React.FC = () => {
  const { resident: authResident, loading: authLoading } = useSeniorResident();
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [showcaseResident, setShowcaseResident] = useState<any>(null);
  const [showcaseLoading, setShowcaseLoading] = useState(true);
  const { getAccessibilitySettings, updateAccessibilitySettings, loading, error } = useAccessibilityPreferences();

  const [language, setLanguage] = useState('English');
  const [voiceLanguage, setVoiceLanguage] = useState('English');
  const [fontSize, setFontSize] = useState('Large');
  const [highContrast, setHighContrast] = useState(false);
  const [voiceInput, setVoiceInput] = useState(true);
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [medReminders, setMedReminders] = useState(true);
  const [aptReminders, setAptReminders] = useState(true);
  const [shareWithFamily, setShareWithFamily] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    } else if (!isShowcaseMode) {
      setShowcaseLoading(false);
    }
  }, [isShowcaseMode, selectedResidentId]);

  const resident = isShowcaseMode ? showcaseResident : authResident;
  const residentLoading = isShowcaseMode ? showcaseLoading : authLoading;

  useEffect(() => {
    if (resident && !residentLoading) {
      loadSettings();
    }
  }, [resident, residentLoading]);

  const loadSettings = async () => {
    try {
      const settings = await getAccessibilitySettings();
      if (settings) {
        setFontSize(settings.text_size || 'Large');
        setHighContrast(settings.high_contrast_mode || false);
        setVoiceInput(settings.simplified_ui_mode !== undefined ? !settings.simplified_ui_mode : true);
        setTextToSpeech(settings.voice_readback_enabled || false);
      }
    } catch (err) {
      console.error('Failed to load accessibility settings:', err);
    }
  };

  if (residentLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">No resident found</p>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      setSuccessMessage(null);

      await updateAccessibilitySettings({
        textSize: fontSize,
        highContrastMode: highContrast,
        buttonSpacing: fontSize === 'Extra Large' ? 'LARGE' : fontSize === 'Large' ? 'NORMAL' : 'COMPACT',
        simplifiedUiMode: !voiceInput,
        voiceReadbackEnabled: textToSpeech,
        voiceReadbackSpeed: 1.0
      });

      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert('Failed to save settings. Please try again.');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Settings
          </h1>
          <p className="text-2xl text-gray-600">
            Customize your experience and manage your care
          </p>
        </div>

        <SeniorOperatingModeSwitcher residentId={resident.id} />

        {successMessage && (
          <div className="bg-green-100 border-2 border-green-300 rounded-2xl p-6 mb-6">
            <p className="text-2xl text-green-800 font-semibold">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-2 border-red-300 rounded-2xl p-6 mb-6">
            <p className="text-2xl text-red-800 font-semibold">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Language & Voice */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Language & Voice
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Choose your preferred languages for display and voice
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Display Language (UI)
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>Mandarin</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Italian</option>
                  <option>Portuguese</option>
                </select>
                <p className="mt-2 text-lg text-gray-500">
                  The language for menus, buttons, and text
                </p>
              </div>

              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Voice/Spoken Language
                </label>
                <select
                  value={voiceLanguage}
                  onChange={(e) => setVoiceLanguage(e.target.value)}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>Mandarin</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Italian</option>
                  <option>Portuguese</option>
                </select>
                <p className="mt-2 text-lg text-gray-500">
                  The language you speak when using voice features
                </p>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="voiceInput"
                  checked={voiceInput}
                  onChange={(e) => setVoiceInput(e.target.checked)}
                  className="w-6 h-6 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="voiceInput" className="ml-3">
                  <span className="block text-2xl font-semibold text-gray-700">
                    Enable Voice Input
                  </span>
                  <span className="block text-lg text-gray-500">
                    Speak to fill forms and send messages
                  </span>
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="textToSpeech"
                  checked={textToSpeech}
                  onChange={(e) => setTextToSpeech(e.target.checked)}
                  className="w-6 h-6 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="textToSpeech" className="ml-3">
                  <span className="block text-2xl font-semibold text-gray-700">
                    Read Aloud (Text-to-Speech)
                  </span>
                  <span className="block text-lg text-gray-500">
                    Have messages and notifications read to you
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Accessibility
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Adjust how information is displayed
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-2xl font-semibold text-gray-700 mb-2">
                  Text Size
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                  <option>Extra Large</option>
                </select>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="highContrast"
                  checked={highContrast}
                  onChange={(e) => setHighContrast(e.target.checked)}
                  className="w-6 h-6 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="highContrast" className="ml-3">
                  <span className="block text-2xl font-semibold text-gray-700">
                    High Contrast Mode
                  </span>
                  <span className="block text-lg text-gray-500">
                    Stronger colors for better visibility
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Reminders & Notifications
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Choose what reminders you receive
            </p>

            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="medReminders"
                  checked={medReminders}
                  onChange={(e) => setMedReminders(e.target.checked)}
                  className="w-6 h-6 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="medReminders" className="ml-3">
                  <span className="block text-2xl font-semibold text-gray-700">
                    Medication Reminders
                  </span>
                  <span className="block text-lg text-gray-500">
                    Notify me when it's time to take medications
                  </span>
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="aptReminders"
                  checked={aptReminders}
                  onChange={(e) => setAptReminders(e.target.checked)}
                  className="w-6 h-6 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="aptReminders" className="ml-3">
                  <span className="block text-2xl font-semibold text-gray-700">
                    Appointment Reminders
                  </span>
                  <span className="block text-lg text-gray-500">
                    Remind me about upcoming appointments
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy & Sharing */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Privacy & Sharing
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Control who can see your information
            </p>

            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="shareWithFamily"
                  checked={shareWithFamily}
                  onChange={(e) => setShareWithFamily(e.target.checked)}
                  className="w-6 h-6 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="shareWithFamily" className="ml-3">
                  <span className="block text-2xl font-semibold text-gray-700">
                    Share With Family Members
                  </span>
                  <span className="block text-lg text-gray-500">
                    Allow family to view your health information
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-lg text-blue-800">
                  💡 Use "Care Management Mode" above to control whether family can manage your care or just view it.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full mt-8 p-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl shadow-lg text-2xl font-semibold transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
