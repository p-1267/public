import { useEffect, useState } from 'react';
import { useOnboardingWizard, OnboardingState } from '../hooks/useOnboardingWizard';
import { OrgIdentityForm } from './OrgIdentityForm';
import { InsuranceConfigForm } from './InsuranceConfigForm';
import { SOPIngestionForm } from './SOPIngestionForm';
import { RoleBaselinesForm } from './RoleBaselinesForm';
import { EscalationConfigForm } from './EscalationConfigForm';
import { LegalAcceptanceForm } from './LegalAcceptanceForm';

interface Props {
  agencyId: string;
  onComplete: () => void;
}

const STATE_SEQUENCE: OnboardingState[] = [
  'UNINITIALIZED',
  'ORG_IDENTITY',
  'INSURANCE_CONFIG',
  'SOP_INGESTION',
  'ROLE_DEFAULTS',
  'ESCALATION_BASELINES',
  'LEGAL_ACCEPTANCE',
  'COMPLETED'
];

const STATE_LABELS: Record<OnboardingState, string> = {
  UNINITIALIZED: 'Initialize',
  ORG_IDENTITY: 'Organization Identity',
  INSURANCE_CONFIG: 'Insurance & Liability',
  SOP_INGESTION: 'SOP Policy Binding',
  ROLE_DEFAULTS: 'Role Permission Defaults',
  ESCALATION_BASELINES: 'Escalation Configuration',
  LEGAL_ACCEPTANCE: 'Legal Acceptance',
  COMPLETED: 'Completed'
};

export function OrganizationOnboardingWizard({ agencyId, onComplete }: Props) {
  const {
    status,
    loading,
    error: hookError,
    initializeOnboarding,
    saveOrgIdentity,
    saveInsuranceConfig,
    uploadSOPDocument,
    completeSOPIngestion,
    saveRoleBaselines,
    saveEscalationConfig,
    finalizeOnboarding,
    refresh
  } = useOnboardingWizard(agencyId);

  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (status?.currentState === 'COMPLETED' && status.locked) {
      onComplete();
    }
  }, [status, onComplete]);

  const handleInitialize = async () => {
    try {
      setError(null);
      setInitializing(true);
      await initializeOnboarding();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize onboarding');
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding status...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Onboarding Error</h2>
          <p className="text-gray-600 text-center mb-4">Failed to load onboarding status</p>
          {hookError && (
            <p className="text-sm text-red-600 text-center mb-4">{hookError}</p>
          )}
        </div>
      </div>
    );
  }

  if (!status.initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Organization Onboarding Required
            </h1>
            <p className="text-gray-600 mb-4">
              This organization must complete the legal initialization sequence before any operations can begin.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-2">SYSTEM LOCKED</h3>
            <ul className="text-sm text-red-800 space-y-1">
              <li>❌ Care execution is BLOCKED</li>
              <li>❌ Resident creation is BLOCKED</li>
              <li>❌ Device pairing is BLOCKED</li>
              <li>❌ Billing is BLOCKED</li>
              <li>❌ Reporting is BLOCKED</li>
            </ul>
            <p className="text-sm text-red-800 mt-2 font-medium">
              Only read-only system access is allowed until onboarding is complete.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What is Organization Onboarding?</h3>
            <p className="text-sm text-blue-800 mb-2">
              Organization onboarding is a <strong>LEGAL INITIALIZATION STATE MACHINE</strong> that establishes:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Legal identity and jurisdiction (permanently locked)</li>
              <li>• Insurance and liability configuration</li>
              <li>• Standard Operating Procedures (SOPs) binding</li>
              <li>• Role-based permission defaults</li>
              <li>• Escalation and notification baselines</li>
              <li>• Legal acceptance and audit lock-in</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleInitialize}
            disabled={initializing}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {initializing ? 'Initializing...' : 'Begin Organization Onboarding'}
          </button>
        </div>
      </div>
    );
  }

  const currentStateIndex = STATE_SEQUENCE.indexOf(status.currentState);
  const progressPercentage = ((currentStateIndex) / (STATE_SEQUENCE.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Organization Onboarding</h1>
              <p className="text-sm text-gray-600">Legal Initialization State Machine</p>
            </div>
            {status.locked && (
              <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold">LOCKED</span>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
              <div
                style={{ width: `${progressPercentage}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300"
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              {STATE_SEQUENCE.slice(1, -1).map((state, idx) => {
                const stateIndex = idx + 1;
                const isCompleted = status.completedStates.includes(state);
                const isCurrent = status.currentState === state;

                return (
                  <div key={state} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {isCompleted ? '✓' : stateIndex}
                    </div>
                    <span className="text-xs text-gray-600 mt-1 text-center max-w-[80px]">
                      {STATE_LABELS[state]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-800 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {status.currentState === 'ORG_IDENTITY' && (
          <OrgIdentityForm
            agencyId={agencyId}
            onSave={saveOrgIdentity}
            onError={setError}
          />
        )}

        {status.currentState === 'INSURANCE_CONFIG' && (
          <InsuranceConfigForm
            agencyId={agencyId}
            onSave={saveInsuranceConfig}
            onError={setError}
          />
        )}

        {status.currentState === 'SOP_INGESTION' && (
          <SOPIngestionForm
            agencyId={agencyId}
            currentSOPCount={status.sopCount}
            onUpload={uploadSOPDocument}
            onComplete={completeSOPIngestion}
            onError={setError}
          />
        )}

        {status.currentState === 'ROLE_DEFAULTS' && (
          <RoleBaselinesForm
            agencyId={agencyId}
            onSave={saveRoleBaselines}
            onError={setError}
          />
        )}

        {status.currentState === 'ESCALATION_BASELINES' && (
          <EscalationConfigForm
            agencyId={agencyId}
            onSave={saveEscalationConfig}
            onError={setError}
          />
        )}

        {status.currentState === 'LEGAL_ACCEPTANCE' && (
          <LegalAcceptanceForm
            agencyId={agencyId}
            onFinalize={finalizeOnboarding}
            onError={setError}
          />
        )}
      </div>
    </div>
  );
}
