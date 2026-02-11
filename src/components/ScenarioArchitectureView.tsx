import React, { useState } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { SCENARIO_ARCHITECTURES, FEATURE_SCENARIO_MAPPINGS } from '../config/scenarioArchitecture';

export function ScenarioArchitectureView() {
  const { currentScenario, advanceToNextStep, goBackToScenarioSelection } = useShowcase();
  const [showDetails, setShowDetails] = useState(false);

  if (!currentScenario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Scenario Selected</h1>
          <p className="text-gray-600 mb-6">Please select a care scenario to continue.</p>
          <button
            onClick={goBackToScenarioSelection}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Scenario Selection
          </button>
        </div>
      </div>
    );
  }

  const architecture = SCENARIO_ARCHITECTURES[currentScenario.id as keyof typeof SCENARIO_ARCHITECTURES];

  if (!architecture) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Architecture Not Found</h1>
          <p className="text-gray-600 mb-6">Architecture data for this scenario is not available.</p>
          <button
            onClick={goBackToScenarioSelection}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Scenario Selection
          </button>
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    advanceToNextStep();
  };

  const handleBackToScenarios = () => {
    goBackToScenarioSelection();
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="mb-8">
            <div className="inline-block bg-yellow-50 border border-yellow-400 rounded px-4 py-2 mb-6">
              <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">
                Showcase Mode
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {currentScenario.name}
            </h1>
            <p className="text-base text-gray-700">
              How this scenario works
            </p>
          </div>

          <div className="space-y-8">
            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                1. Roles Involved
              </h2>
              <div className="overflow-hidden border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-900">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-900">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-900">What they do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {architecture.activeRoles.map((role) => (
                      <tr key={role.role} className="border-b border-gray-200 last:border-0">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {role.role.replace('_', ' ').replace('FAMILY VIEWER', 'Family').replace('AGENCY ADMIN', 'Agency Admin')}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {role.status === 'CORE' ? 'Core' : role.status === 'OPTIONAL' ? 'Optional' : 'Not used'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{role.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                2. Intelligence Pipeline
              </h2>
              <div className="space-y-4 text-sm">
                <div className="pb-3 border-b border-gray-200">
                  <div className="font-bold text-gray-900 mb-1">Voice Input</div>
                  <div className="text-gray-700">Staff or senior speaks in their own language.</div>
                </div>
                <div className="pb-3 border-b border-gray-200">
                  <div className="font-bold text-gray-900 mb-1">Deterministic Translation</div>
                  <div className="text-gray-700">
                    Speech is translated accurately into the required clinical language<br/>
                    (not AI guessing, no paraphrasing).
                  </div>
                </div>
                <div className="pb-3 border-b border-gray-200">
                  <div className="font-bold text-gray-900 mb-1">Brain Enforcement</div>
                  <div className="text-gray-700">
                    Rules check safety, compliance, timing, and permissions.
                  </div>
                </div>
                <div className="pb-3 border-b border-gray-200">
                  <div className="font-bold text-gray-900 mb-1">AI Assistance (Limited)</div>
                  <div className="text-gray-700">
                    AI may suggest, summarize, or explain —<br/>
                    AI cannot act, submit, or decide.
                  </div>
                </div>
                <div>
                  <div className="font-bold text-gray-900 mb-1">Human Confirmation</div>
                  <div className="text-gray-700">
                    A human is always responsible for final actions.
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                3. What Is Blocked and Why
              </h2>
              <div className="space-y-1 text-sm text-gray-700">
                <div>Medication without clock-in → blocked (safety)</div>
                <div>Documentation without context → blocked (audit)</div>
                <div>Emergency overlap → blocked (risk)</div>
              </div>
            </section>

            <section className="bg-yellow-50 border border-yellow-400 p-5">
              <h3 className="font-bold text-gray-900 mb-2">
                Showcase Mode
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                This walkthrough explains how the system works.<br/>
                No data is written. No actions are executed.
              </p>
            </section>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={handleBackToScenarios}
              className="border-2 border-gray-300 hover:border-gray-900 text-gray-900 font-medium px-6 py-3 transition-colors"
            >
              Back to Scenarios
            </button>
            <button
              onClick={handleContinue}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
