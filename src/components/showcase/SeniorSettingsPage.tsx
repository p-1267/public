import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

function generateUUID(): string {
  return crypto.randomUUID();
}

export const SeniorSettingsPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateUUID());

  const [textSize, setTextSize] = useState<string>('MEDIUM');
  const [highContrast, setHighContrast] = useState(false);
  const [buttonSpacing, setButtonSpacing] = useState<string>('STANDARD');
  const [simplifiedUI, setSimplifiedUI] = useState(false);
  const [voiceReadback, setVoiceReadback] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);

  useEffect(() => {
    loadSettings();
  }, [isShowcaseMode]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_senior_accessibility_settings');

    if (!error && data) {
      setTextSize(data.text_size || 'MEDIUM');
      setHighContrast(data.high_contrast_mode || false);
      setButtonSpacing(data.button_spacing || 'STANDARD');
      setSimplifiedUI(data.simplified_ui_mode || false);
      setVoiceReadback(data.voice_readback_enabled || false);
      setVoiceSpeed(data.voice_readback_speed || 1.0);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    const { data, error } = await supabase.rpc('update_senior_accessibility_settings', {
      p_text_size: textSize,
      p_high_contrast_mode: highContrast,
      p_button_spacing: buttonSpacing,
      p_simplified_ui_mode: simplifiedUI,
      p_voice_readback_enabled: voiceReadback,
      p_voice_readback_speed: voiceSpeed,
      p_device_fingerprint: navigator.userAgent,
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
        <div className="text-center py-12 text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accessibility Settings</h1>
        <p className="text-gray-600">Customize how you interact with the app</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Display Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Text Size</label>
              <select
                value={textSize}
                onChange={(e) => setTextSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SMALL">Small</option>
                <option value="MEDIUM">Medium</option>
                <option value="LARGE">Large</option>
                <option value="EXTRA_LARGE">Extra Large</option>
              </select>
            </div>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">High Contrast Mode</div>
                <div className="text-sm text-gray-600">Increase color contrast for better visibility</div>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Button Spacing</label>
              <select
                value={buttonSpacing}
                onChange={(e) => setButtonSpacing(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="COMPACT">Compact</option>
                <option value="STANDARD">Standard</option>
                <option value="SPACIOUS">Spacious</option>
              </select>
            </div>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={simplifiedUI}
                onChange={(e) => setSimplifiedUI(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Simplified Interface</div>
                <div className="text-sm text-gray-600">Show only essential features</div>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={voiceReadback}
                onChange={(e) => setVoiceReadback(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Voice Readback</div>
                <div className="text-sm text-gray-600">Read text aloud when tapped</div>
              </div>
            </label>

            {voiceReadback && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Voice Speed</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 w-12">{voiceSpeed.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-lg"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
