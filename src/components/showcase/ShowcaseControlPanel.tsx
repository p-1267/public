import React, { useState } from 'react';
import {
  createAndSeedShowcaseAgency,
  resetShowcaseAgency,
} from '../../services/showcaseSeeder';
import { WP1ScenarioExecution } from '../WP1ScenarioExecution';
import { WP2AcceptanceTest } from '../WP2AcceptanceTest';
import { verifyCapabilities } from '../../services/capabilityVerifier';

interface ShowcaseControlPanelProps {
  currentAgencyId: string | null;
  isShowcaseMode: boolean;
  onAgencySwitch: (agencyId: string) => void;
}

export function ShowcaseControlPanel({
  currentAgencyId,
  isShowcaseMode,
  onAgencySwitch,
}: ShowcaseControlPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [activeView, setActiveView] = useState<
    'overview' | 'scenarios' | 'inspector' | 'jobs'
  >('overview');
  const [activeScenario, setActiveScenario] = useState<'wp1' | 'wp2' | null>(null);

  const handleCreateShowcase = async () => {
    setIsCreating(true);
    try {
      const result = await createAndSeedShowcaseAgency(
        `Showcase ${new Date().toLocaleString()}`
      );
      if (result.success && result.agencyId) {
        onAgencySwitch(result.agencyId);
        alert(`Showcase agency created successfully!\n\nCreated:\n- ${result.residents.length} residents\n- ${result.users.length} users\n- ${result.departments.length} departments\n- ${result.tasks.length} tasks`);
      } else {
        alert(`Error creating showcase: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating showcase:', error);
      alert('Failed to create showcase agency');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = async () => {
    if (!currentAgencyId) return;

    if (
      !confirm(
        'This will delete all operational data and reseed the showcase. Continue?'
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const success = await resetShowcaseAgency(currentAgencyId);
      if (success) {
        alert('Showcase agency reset successfully!');
        window.location.reload();
      } else {
        alert('Failed to reset showcase agency');
      }
    } catch (error) {
      console.error('Error resetting showcase:', error);
      alert('Failed to reset showcase agency');
    } finally {
      setIsResetting(false);
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
      >
        <span className="text-xl">🎯</span>
        <span className="font-medium">Open Showcase Control</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Showcase Control Panel</h2>
              <p className="text-blue-100 text-sm mt-1">
                Full visibility and control over showcase mode
              </p>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {isShowcaseMode && (
            <div className="mt-4 flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-4 py-2 w-fit">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Showcase Mode Active</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-bold text-gray-900 mb-2">Showcase Mode</h3>
              <p className="text-sm text-gray-700 mb-4">
                Production-identical environment with full visibility
              </p>
              {!currentAgencyId ? (
                <button
                  onClick={handleCreateShowcase}
                  disabled={isCreating}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Showcase Agency'}
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isResetting ? 'Resetting...' : 'Reset Showcase Data'}
                </button>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200">
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-bold text-gray-900 mb-2">Inspection Tools</h3>
              <p className="text-sm text-gray-700 mb-4">
                View Brain decisions, jobs, and state transitions
              </p>
              <button
                onClick={() => setActiveView('inspector')}
                className="w-full bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Open Inspectors
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
              <div className="text-3xl mb-2">🎬</div>
              <h3 className="font-bold text-gray-900 mb-2">Test Scenarios</h3>
              <p className="text-sm text-gray-700 mb-4">
                Run end-to-end scenarios with validation
              </p>
              <button
                onClick={() => setActiveView('scenarios')}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Run Scenarios
              </button>
            </div>
          </div>

          {activeView === 'scenarios' && activeScenario ? (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">
                  {activeScenario === 'wp1' ? 'WP1 Acceptance Test' : 'WP2 Acceptance Test'}
                </h3>
                <button
                  onClick={() => {
                    setActiveView('overview');
                    setActiveScenario(null);
                  }}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </button>
              </div>
              {currentAgencyId && activeScenario === 'wp1' && (
                <WP1ScenarioExecution agencyId={currentAgencyId} />
              )}
              {currentAgencyId && activeScenario === 'wp2' && (
                <WP2AcceptanceTest agencyId={currentAgencyId} />
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4">Available Scenarios</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="text-green-600">★</span>
                      WP1: Run a Day - Complete Operational Cycle
                    </div>
                    <div className="text-sm text-gray-600">
                      Tests: supervisor assignment → caregiver execution with evidence → supervisor review → manager oversight
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveScenario('wp1');
                      setActiveView('scenarios');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Run
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="text-green-600">★</span>
                      WP2: Caregiver Speed Run - Tap & Voice First
                    </div>
                    <div className="text-sm text-gray-600">
                      Tests: 10 quick-tap tasks (≤1 tap, 0 typing, ≤30s) + exception case + 3 voice extractions
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveScenario('wp2');
                      setActiveView('scenarios');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Run
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                  <div>
                    <div className="font-medium text-gray-900">
                      Morning Medication Round
                    </div>
                    <div className="text-sm text-gray-600">
                      Tests: task lifecycle, evidence capture, review workflow
                    </div>
                  </div>
                  <button disabled className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed">
                    Not Implemented
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                  <div>
                    <div className="font-medium text-gray-900">
                      Fall Risk Detection
                    </div>
                    <div className="text-sm text-gray-600">
                      Tests: observation, pattern detection, alert generation
                    </div>
                  </div>
                  <button disabled className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed">
                    Not Implemented
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                  <div>
                    <div className="font-medium text-gray-900">Offline Care Delivery</div>
                    <div className="text-sm text-gray-600">
                      Tests: offline queue, sync, conflict resolution
                    </div>
                  </div>
                  <button disabled className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed">
                    Not Implemented
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg opacity-50">
                  <div>
                    <div className="font-medium text-gray-900">Emergency Response</div>
                    <div className="text-sm text-gray-600">
                      Tests: brain blocking, state transitions, emergency protocols
                    </div>
                  </div>
                  <button disabled className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium cursor-not-allowed">
                    Not Implemented
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="font-bold text-yellow-900 mb-2">
                  Showcase Mode Requirements
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>✓ No mock data - All data created via production RPCs</li>
                  <li>✓ No mock behavior - Same code paths as production</li>
                  <li>✓ No stubbed services - Real logic execution</li>
                  <li>✓ Full transparency - All decisions and jobs visible</li>
                  <li>✓ Deterministic testing - Scenarios PASS/FAIL clearly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
