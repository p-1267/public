import React from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';

export function ShowcaseIntelligenceOverview() {
  const { currentScenario, advanceToNextStep, goBackToScenarioSelection } = useShowcase();

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

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded p-8">
          <div className="mb-8">
            <div className="inline-block bg-yellow-50 border border-yellow-400 rounded px-4 py-2 mb-6">
              <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">
                Showcase Mode
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Why This Platform Is Trustworthy
            </h1>
            <p className="text-base text-gray-700">
              Understanding how intelligence works and what it cannot do
            </p>
          </div>

          <div className="space-y-6">
            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Brain Enforcement
              </h2>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                The Brain is a state machine that validates every action before execution.
              </p>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">What it blocks</div>
                  <div className="text-gray-700 space-y-1">
                    <div>— Medication administration if caregiver not clocked in</div>
                    <div>— Care actions during emergency without supervisor approval</div>
                    <div>— State transitions that violate workflow rules</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">Why it blocks</div>
                  <div className="text-gray-700 space-y-1">
                    <div>— Resident safety (primary)</div>
                    <div>— Compliance requirements (mandatory)</div>
                    <div>— Audit trail integrity (non-negotiable)</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                AI Assistance
              </h2>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                AI provides context and suggestions, but never executes actions.
              </p>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">What AI can do</div>
                  <div className="text-gray-700 space-y-1">
                    <div>— Suggest documentation based on resident baseline</div>
                    <div>— Flag potential medication interactions</div>
                    <div>— Recommend next steps based on SOP rules</div>
                    <div>— Generate draft reports for human review</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-1">What AI cannot do</div>
                  <div className="text-gray-700 space-y-1">
                    <div>— Execute care actions (Brain blocks this)</div>
                    <div>— Submit documentation without human review</div>
                    <div>— Override compliance rules</div>
                    <div>— Make clinical decisions</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-900">
                    Human-in-the-Loop Guarantee: Every AI suggestion requires explicit human confirmation.
                  </p>
                </div>
              </div>
            </section>

            <section className="border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Why This Platform Is Trustworthy
              </h2>
              <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
                <div><span className="font-medium text-gray-900">Explainable</span> — Every blocked action shows exactly why and what is needed</div>
                <div><span className="font-medium text-gray-900">Human-Controlled</span> — AI suggests, humans decide and confirm</div>
                <div><span className="font-medium text-gray-900">Traceable</span> — Complete audit trail from voice to translation to action</div>
                <div><span className="font-medium text-gray-900">Safe</span> — Brain blocks unsafe actions before they reach the database</div>
                <div><span className="font-medium text-gray-900">Intelligent</span> — Proactive signals surface issues before they become critical</div>
              </div>
            </section>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={goBackToScenarioSelection}
              className="border-2 border-gray-300 hover:border-gray-900 text-gray-900 font-medium px-6 py-3 transition-colors"
            >
              Back to Scenarios
            </button>
            <button
              onClick={advanceToNextStep}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 transition-colors"
            >
              Enter Platform
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
