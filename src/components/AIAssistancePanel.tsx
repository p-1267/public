import { useState, useEffect } from 'react';
import { useAIAssistance } from '../hooks/useAIAssistance';

export function AIAssistancePanel() {
  const [config, setConfig] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    getAIAssistanceConfig,
    updateAIAssistanceConfig,
    getUserAISuggestions,
    dismissAISuggestion,
    acceptAISuggestion
  } = useAIAssistance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configData, suggestionsData] = await Promise.all([
        getAIAssistanceConfig(),
        getUserAISuggestions()
      ]);
      setConfig(configData.config);
      setSuggestions(suggestionsData.suggestions || []);
    } catch (err) {
      console.error('Failed to load AI assistance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAI = async (enabled: boolean) => {
    try {
      setMessage(null);
      await updateAIAssistanceConfig({ isEnabled: enabled });
      setMessage({ type: 'success', text: `AI assistance ${enabled ? 'enabled' : 'disabled'}` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update config' });
    }
  };

  const handleToggleShadowAI = async (enabled: boolean) => {
    try {
      setMessage(null);
      await updateAIAssistanceConfig({ shadowAIEnabled: enabled });
      setMessage({ type: 'success', text: `Shadow AI ${enabled ? 'enabled' : 'disabled'}` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update config' });
    }
  };

  const handleToggleVoiceGuidance = async (enabled: boolean) => {
    try {
      setMessage(null);
      await updateAIAssistanceConfig({ voiceGuidanceEnabled: enabled });
      setMessage({ type: 'success', text: `Voice guidance ${enabled ? 'enabled' : 'disabled'}` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update config' });
    }
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    try {
      setMessage(null);
      await dismissAISuggestion(suggestionId);
      setMessage({ type: 'success', text: 'Suggestion dismissed' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to dismiss suggestion' });
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      setMessage(null);
      await acceptAISuggestion(suggestionId);
      setMessage({ type: 'success', text: 'Suggestion accepted - you must still perform the action' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to accept suggestion' });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { color: string }> = {
      HIGH: { color: 'bg-blue-100 text-blue-800' },
      NORMAL: { color: 'bg-gray-100 text-gray-800' },
      LOW: { color: 'bg-gray-50 text-gray-600' }
    };
    const badge = badges[priority] || badges.NORMAL;
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{priority}</span>;
  };

  const getSuggestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      REMINDER: 'Reminder',
      BEST_PRACTICE: 'Best Practice',
      POLICY_EXPLANATION: 'Policy Explanation'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading AI assistance...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">AI Assistance & Shadow AI</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <p className="text-sm text-yellow-800 font-bold">Core Principle:</p>
        <p className="text-sm text-yellow-800 mt-1">
          AI exists to reduce error, not to replace judgment. The Brain enforces. AI advises. Humans act.
        </p>
      </div>

      {config && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded p-4">
            <h3 className="font-bold mb-4">Configuration</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">AI Assistance</div>
                  <div className="text-xs text-gray-600">Enable AI-powered suggestions</div>
                </div>
                <button
                  onClick={() => handleToggleAI(!config.is_enabled)}
                  className={`px-4 py-2 rounded font-semibold ${
                    config.is_enabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                  }`}
                >
                  {config.is_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">Shadow AI Observation</div>
                  <div className="text-xs text-gray-600">Allow AI to observe workflow patterns</div>
                </div>
                <button
                  onClick={() => handleToggleShadowAI(!config.shadow_ai_enabled)}
                  disabled={!config.is_enabled}
                  className={`px-4 py-2 rounded font-semibold ${
                    config.shadow_ai_enabled && config.is_enabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                  } disabled:opacity-50`}
                >
                  {config.shadow_ai_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">Voice Guidance</div>
                  <div className="text-xs text-gray-600">Enable voice-first assistance</div>
                </div>
                <button
                  onClick={() => handleToggleVoiceGuidance(!config.voice_guidance_enabled)}
                  disabled={!config.is_enabled}
                  className={`px-4 py-2 rounded font-semibold ${
                    config.voice_guidance_enabled && config.is_enabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                  } disabled:opacity-50`}
                >
                  {config.voice_guidance_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="text-xs font-semibold text-gray-700 mb-2">AI Observes:</div>
              <div className="text-xs text-gray-600 space-y-1">
                {config.observation_scope.workflow_patterns && <div>• Workflow patterns</div>}
                {config.observation_scope.repeated_errors && <div>• Repeated errors</div>}
                {config.observation_scope.delayed_actions && <div>• Delayed actions</div>}
                {config.observation_scope.incomplete_documentation && <div>• Incomplete documentation</div>}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <h3 className="font-bold mb-4">Active Suggestions ({suggestions.length})</h3>
            {suggestions.length === 0 ? (
              <div className="text-gray-600 text-center py-4">No active suggestions</div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="border border-blue-200 bg-blue-50 rounded p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                          Suggestion
                        </span>
                        <span className="text-xs text-blue-600 font-semibold">
                          {getSuggestionTypeLabel(suggestion.suggestion_type)}
                        </span>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                      {suggestion.is_blocking && (
                        <span className="text-xs text-red-600 font-bold">BLOCKING (ERROR)</span>
                      )}
                    </div>

                    <div className="font-bold text-blue-900 mb-1">{suggestion.title}</div>
                    <div className="text-sm text-blue-800 mb-3">{suggestion.content}</div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-blue-600">
                        {new Date(suggestion.created_at).toLocaleString()}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptSuggestion(suggestion.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDismissSuggestion(suggestion.id)}
                          className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm font-semibold hover:bg-gray-400"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded p-4 mt-6">
        <p className="text-sm text-red-800 font-bold">Shadow AI Prohibitions:</p>
        <p className="text-sm text-red-800 mt-2">
          Shadow AI MUST NOT: create tasks, assign work, trigger alerts, escalate emergencies, modify schedules, change permissions, auto-fill records, or confirm actions.
        </p>
        <p className="text-sm text-red-800 mt-2 font-bold">
          No AI output may: trigger an action, block an action, override policy, or modify records.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
        <p className="text-sm text-blue-800 font-semibold">Visual Distinction:</p>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded font-bold text-xs">
              Required by Policy
            </span>
            <span className="text-xs text-blue-800">= Brain Requirement (Blocking, High Contrast)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold text-xs">
              Suggestion
            </span>
            <span className="text-xs text-blue-800">= AI Suggestion (Non-blocking, Neutral Color)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
