import { useState, useEffect } from 'react';
import { useCompliance } from '../hooks/useCompliance';

export function AppStoreCompliancePanel() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('WEB');
  const [disclosures, setDisclosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getActiveDisclosures } = useCompliance();

  const platforms = [
    { id: 'WEB', name: 'Web Distribution', store: 'Browser-based', icon: '🌐' },
    { id: 'IOS', name: 'iOS', store: 'Apple App Store', icon: '🍎' },
    { id: 'ANDROID', name: 'Android', store: 'Google Play Store', icon: '🤖' }
  ];

  useEffect(() => {
    loadDisclosures();
  }, [selectedPlatform]);

  const loadDisclosures = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await getActiveDisclosures(selectedPlatform);
      setDisclosures(data.disclosures || []);
    } catch (err) {
      console.error('Failed to load disclosures:', err);
      setMessage({ type: 'error', text: 'Failed to load disclosures' });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      DATA_COLLECTED: { color: 'bg-blue-100 text-blue-800', label: 'Data Collected' },
      DATA_PURPOSE: { color: 'bg-green-100 text-green-800', label: 'Data Purpose' },
      AI_ASSISTANCE: { color: 'bg-purple-100 text-purple-800', label: 'AI Assistance' },
      THIRD_PARTY_SHARING: { color: 'bg-orange-100 text-orange-800', label: 'Third-Party Sharing' },
      EMERGENCY_BEHAVIOR: { color: 'bg-red-100 text-red-800', label: 'Emergency Behavior' }
    };
    const badge = badges[category] || { color: 'bg-gray-100 text-gray-800', label: category };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{badge.label}</span>;
  };

  if (loading && disclosures.length === 0) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading compliance data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">App Store Compliance, Platform Policies & Distribution Readiness</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <p className="text-sm text-blue-800 font-bold">Core Principle:</p>
        <p className="text-sm text-blue-800 mt-1">
          If the app cannot be approved by platforms, it cannot be trusted by users.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-bold mb-3">Platform Targets</h3>
        <div className="grid grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`p-4 border rounded text-left transition-colors ${
                selectedPlatform === platform.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="text-2xl mb-2">{platform.icon}</div>
              <div className="font-bold text-sm">{platform.name}</div>
              <div className="text-xs text-gray-600 mt-1">{platform.store}</div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <span className="text-green-600">✓</span>
                <span className="text-gray-600">Compliance Mandatory</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Required Disclosures for {selectedPlatform}</h3>
          <span className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">
            Explicit & Truthful
          </span>
        </div>

        {loading ? (
          <div className="text-gray-600 text-center py-8">Loading disclosures...</div>
        ) : disclosures.length === 0 ? (
          <div className="text-gray-600 text-center py-8">No disclosures available</div>
        ) : (
          <div className="space-y-4">
            {disclosures.map((disclosure) => (
              <div key={disclosure.disclosure_id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryBadge(disclosure.disclosure_category)}
                    </div>
                    <h4 className="font-bold text-lg">{disclosure.disclosure_title}</h4>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{disclosure.disclosure_content}</p>

                <div className="border-t pt-3 mt-3">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={disclosure.is_explicit ? 'text-green-600' : 'text-red-600'}>
                        {disclosure.is_explicit ? '✓' : '✗'}
                      </span>
                      <span className="text-gray-600">Explicit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={disclosure.is_truthful ? 'text-green-600' : 'text-red-600'}>
                        {disclosure.is_truthful ? '✓' : '✗'}
                      </span>
                      <span className="text-gray-600">Truthful</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={!disclosure.contains_dark_patterns ? 'text-green-600' : 'text-red-600'}>
                        {!disclosure.contains_dark_patterns ? '✓' : '✗'}
                      </span>
                      <span className="text-gray-600">No Dark Patterns</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={disclosure.is_accessible_in_app ? 'text-green-600' : 'text-red-600'}>
                        {disclosure.is_accessible_in_app ? '✓' : '✗'}
                      </span>
                      <span className="text-gray-600">Accessible In-App</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={disclosure.shown_during_onboarding ? 'text-green-600' : 'text-red-600'}>
                        {disclosure.shown_during_onboarding ? '✓' : '✗'}
                      </span>
                      <span className="text-gray-600">Shown at Onboarding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={disclosure.reviewable_anytime ? 'text-green-600' : 'text-red-600'}>
                        {disclosure.reviewable_anytime ? '✓' : '✗'}
                      </span>
                      <span className="text-gray-600">Reviewable Anytime</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded p-4 mt-6">
        <p className="text-sm text-red-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-red-800 mt-2 space-y-1">
          <li>• Platform compliance is mandatory, not optional</li>
          <li>• Disclosures MUST be explicit and truthful</li>
          <li>• No dark patterns allowed</li>
          <li>• Emergency functionality MUST remain available at all times</li>
          <li>• Compliance MUST be auditable</li>
          <li>• Disclosures MUST be: Accessible in-app, Presented during onboarding, Reviewable anytime</li>
          <li>• Request only necessary permissions</li>
          <li>• Just-in-time permission prompts required</li>
          <li>• Denial of non-critical permissions MUST NOT block core functionality</li>
          <li>• Emergency-related permissions MUST be explained clearly</li>
          <li>• AI assistance MUST be explicitly disclosed</li>
          <li>• AI limitations MUST be stated</li>
          <li>• Users MUST understand AI does not make decisions</li>
          <li>• Shadow AI boundaries MUST be restated clearly</li>
          <li>• Emergency features MUST be accessible even if other features are restricted</li>
          <li>• App MUST NOT claim to replace professional medical care</li>
          <li>• Safety disclaimers MUST be present and accurate</li>
          <li>• Platform policy updates MUST be tracked</li>
          <li>• Required changes MUST be logged</li>
          <li>• Compliance updates MUST follow Phase 31 OTA rules</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mt-4">
        <p className="text-sm text-yellow-800 font-semibold">Safety Disclaimers:</p>
        <ul className="text-sm text-yellow-800 mt-2 space-y-1">
          <li>• This application supports emergency alerts but does not replace 911 or professional emergency services</li>
          <li>• This application does not provide medical advice, diagnosis, or treatment</li>
          <li>• Always consult qualified healthcare professionals for medical decisions</li>
          <li>• AI assistance provides insights only; all care decisions are made by qualified human caregivers</li>
          <li>• Emergency features require active network connectivity and may not work in all situations</li>
        </ul>
      </div>
    </div>
  );
}
