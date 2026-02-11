import { useState, useEffect } from 'react';
import { useAccessibilityPreferences } from '../hooks/useAccessibilityPreferences';

export function SeniorAccessibilityPanel() {
  const [settings, setSettings] = useState({
    textSize: 'MEDIUM',
    highContrastMode: false,
    buttonSpacing: 'STANDARD',
    simplifiedUiMode: false,
    voiceReadbackEnabled: false,
    voiceReadbackSpeed: 1.0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getAccessibilitySettings, updateAccessibilitySettings } = useAccessibilityPreferences();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAccessibilitySettings();

      if (data) {
        setSettings({
          textSize: data.text_size || 'MEDIUM',
          highContrastMode: data.high_contrast_mode || false,
          buttonSpacing: data.button_spacing || 'STANDARD',
          simplifiedUiMode: data.simplified_ui_mode || false,
          voiceReadbackEnabled: data.voice_readback_enabled || false,
          voiceReadbackSpeed: data.voice_readback_speed || 1.0
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      await updateAccessibilitySettings({
        textSize: settings.textSize,
        highContrastMode: settings.highContrastMode,
        buttonSpacing: settings.buttonSpacing,
        simplifiedUiMode: settings.simplifiedUiMode,
        voiceReadbackEnabled: settings.voiceReadbackEnabled,
        voiceReadbackSpeed: settings.voiceReadbackSpeed
      });

      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  const textSizeClass = {
    SMALL: 'text-sm',
    MEDIUM: 'text-base',
    LARGE: 'text-lg',
    EXTRA_LARGE: 'text-2xl'
  }[settings.textSize];

  const buttonSpacingClass = {
    COMPACT: 'p-2',
    STANDARD: 'p-3',
    SPACIOUS: 'p-4'
  }[settings.buttonSpacing];

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${textSizeClass} ${settings.highContrastMode ? 'bg-black text-white' : ''}`}>
      <h2 className="text-3xl font-bold mb-6">Accessibility Settings</h2>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <p className="text-sm text-blue-800">
          These settings help make the app easier to use. All changes are automatically saved across all your devices.
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
          <label className="block font-semibold mb-3">Text Size</label>
          <div className="grid grid-cols-2 gap-3">
            {['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'].map(size => (
              <button
                key={size}
                onClick={() => setSettings({...settings, textSize: size})}
                className={`${buttonSpacingClass} border-2 rounded-lg font-semibold ${
                  settings.textSize === size
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                {size.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-3">Button Spacing</label>
          <div className="grid grid-cols-3 gap-3">
            {['COMPACT', 'STANDARD', 'SPACIOUS'].map(spacing => (
              <button
                key={spacing}
                onClick={() => setSettings({...settings, buttonSpacing: spacing})}
                className={`${buttonSpacingClass} border-2 rounded-lg font-semibold ${
                  settings.buttonSpacing === spacing
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-300 bg-white text-gray-800'
                }`}
              >
                {spacing}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block font-semibold">High Contrast Mode</label>
              <p className="text-sm text-gray-600">Increases contrast for better visibility</p>
            </div>
            <button
              onClick={() => setSettings({...settings, highContrastMode: !settings.highContrastMode})}
              className={`w-16 h-8 rounded-full transition-colors ${
                settings.highContrastMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                settings.highContrastMode ? 'translate-x-9' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block font-semibold">Simplified UI Mode</label>
              <p className="text-sm text-gray-600">Shows only essential features</p>
            </div>
            <button
              onClick={() => setSettings({...settings, simplifiedUiMode: !settings.simplifiedUiMode})}
              className={`w-16 h-8 rounded-full transition-colors ${
                settings.simplifiedUiMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                settings.simplifiedUiMode ? 'translate-x-9' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block font-semibold">Voice Read-Back</label>
              <p className="text-sm text-gray-600">Reads text aloud</p>
            </div>
            <button
              onClick={() => setSettings({...settings, voiceReadbackEnabled: !settings.voiceReadbackEnabled})}
              className={`w-16 h-8 rounded-full transition-colors ${
                settings.voiceReadbackEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                settings.voiceReadbackEnabled ? 'translate-x-9' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {settings.voiceReadbackEnabled && (
            <div className="ml-4 mb-4">
              <label className="block font-medium mb-2">Reading Speed: {settings.voiceReadbackSpeed}x</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={settings.voiceReadbackSpeed}
                onChange={(e) => setSettings({...settings, voiceReadbackSpeed: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Slower (0.5x)</span>
                <span>Normal (1.0x)</span>
                <span>Faster (2.0x)</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full ${buttonSpacingClass} bg-blue-600 text-white rounded-lg font-bold text-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm text-yellow-800 font-semibold">Safety Note:</p>
          <p className="text-sm text-yellow-800 mt-1">
            Emergency alerts will always be displayed clearly, regardless of these settings.
          </p>
        </div>
      </div>
    </div>
  );
}
