import { useState } from 'react';

interface Props {
  agencyId: string;
  onFinalize: (typedLegalName: string, deviceFingerprint: string, acceptedTerms: any) => Promise<any>;
  onError: (error: string | null) => void;
}

const ACCEPTANCE_TERMS = {
  dataProcessing: 'I understand and accept that all data entered into this system will be processed, stored, and used in accordance with applicable data protection regulations.',
  aiAssistance: 'I understand that this system includes AI-assisted features with defined boundaries and limitations. AI suggestions are advisory only and do not replace professional judgment.',
  auditImmutability: 'I understand that all actions in this system are immutably logged in the audit trail and cannot be deleted or modified.',
  jurisdictionalResponsibility: 'I accept full responsibility for ensuring that my organization\'s use of this system complies with all applicable laws and regulations in my jurisdiction.',
  permanentLock: 'I understand that completing this onboarding process will PERMANENTLY LOCK the organization configuration and it CANNOT be modified after acceptance.'
};

export function LegalAcceptanceForm({ onFinalize, onError }: Props) {
  const [typedLegalName, setTypedLegalName] = useState('');
  const [acceptances, setAcceptances] = useState<Record<string, boolean>>({
    dataProcessing: false,
    aiAssistance: false,
    auditImmutability: false,
    jurisdictionalResponsibility: false,
    permanentLock: false
  });
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const handleToggleAcceptance = (key: string) => {
    setAcceptances(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const allAccepted = Object.values(acceptances).every(v => v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    if (!typedLegalName.trim()) {
      onError('You must type your organization\'s legal name');
      return;
    }

    if (!allAccepted) {
      onError('You must accept all terms before proceeding');
      return;
    }

    if (!finalConfirmation) {
      onError('You must confirm that you understand this action is permanent');
      return;
    }

    const deviceFingerprint = generateDeviceFingerprint();

    const acceptedTerms = {
      ...acceptances,
      acceptedAt: new Date().toISOString(),
      acceptedBy: 'current_user',
      version: '1.0'
    };

    try {
      setFinalizing(true);
      await onFinalize(typedLegalName, deviceFingerprint, acceptedTerms);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to finalize onboarding');
    } finally {
      setFinalizing(false);
    }
  };

  const generateDeviceFingerprint = (): string => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage
    ];

    const fingerprint = components.join('|');
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fp_${Math.abs(hash).toString(36)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          State 6: Legal Acceptance & Lock-In
        </h2>
        <p className="text-gray-600">
          Final acceptance of terms and permanent lock of organization configuration.
        </p>
      </div>

      <div className="bg-red-50 border-4 border-red-600 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <svg className="w-8 h-8 text-red-600 mr-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-xl font-bold text-red-900 mb-2">⚠️ FINAL LOCK WARNING ⚠️</h3>
            <p className="text-sm text-red-900 mb-3 font-semibold">
              This action is PERMANENT and IRREVERSIBLE.
            </p>
            <p className="text-sm text-red-800 mb-2">
              Once you complete this step:
            </p>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside mb-3">
              <li><strong>Organization configuration is LOCKED</strong></li>
              <li><strong>Jurisdiction CANNOT be changed</strong></li>
              <li><strong>Phase 18 CANNOT be re-entered</strong></li>
              <li><strong>All settings become immutable</strong></li>
            </ul>
            <p className="text-sm text-red-900 font-semibold">
              After this, only operational data can be modified. Structural configuration is frozen.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal Terms & Acceptance</h3>
          <div className="space-y-4">
            {Object.entries(ACCEPTANCE_TERMS).map(([key, term]) => (
              <label
                key={key}
                className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                  acceptances[key]
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={acceptances[key]}
                  onChange={() => handleToggleAcceptance(key)}
                  className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  required
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{term}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Signature</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Type Your Organization's Legal Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={typedLegalName}
              onChange={(e) => setTypedLegalName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
              placeholder="Type exact legal name as entered in State 1"
              required
              autoComplete="off"
            />
            <p className="text-xs text-red-600 mt-2 font-semibold">
              This must EXACTLY match the legal name you entered in State 1. The system will verify this match.
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <label className="flex items-start space-x-3 cursor-pointer p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
            <input
              type="checkbox"
              checked={finalConfirmation}
              onChange={(e) => setFinalConfirmation(e.target.checked)}
              className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              required
            />
            <span className="text-sm font-semibold text-gray-900">
              <strong className="text-red-600">FINAL CONFIRMATION:</strong> I understand this action is PERMANENT.
              Once I click "Finalize Onboarding", the organization configuration will be LOCKED and CANNOT be changed.
              I have reviewed all settings and confirm they are correct.
            </span>
          </label>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">What Happens Next?</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Organization state changes to ACTIVE</li>
            <li>Phase 18 becomes SEALED (cannot be re-entered)</li>
            <li>Legal acceptance record is created (immutable)</li>
            <li>Full system access is granted</li>
            <li>Care operations are unblocked</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="submit"
            disabled={finalizing || !allAccepted || !finalConfirmation || !typedLegalName.trim()}
            className="bg-red-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-lg"
          >
            {finalizing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Finalizing...
              </span>
            ) : (
              '🔒 Finalize Onboarding & Lock Configuration'
            )}
          </button>
        </div>

        {!allAccepted && (
          <p className="text-sm text-red-600 text-center">
            All legal terms must be accepted before you can proceed
          </p>
        )}
      </form>
    </div>
  );
}
