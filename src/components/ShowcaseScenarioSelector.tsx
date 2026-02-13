import React, { useState, useEffect } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { SHOWCASE_SCENARIOS } from '../config/showcase';
import { SCENARIO_META } from '../config/scenarioArchitecture';
import { supabase } from '../lib/supabase';

export function ShowcaseScenarioSelector() {
  const { currentScenario, setScenario, advanceToNextStep, currentStep, currentRole, selectedResidentId } = useShowcase();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState('');

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.replace('#', '');
      setCurrentRoute(hash);
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleDirectAccess = (route: string) => {
    window.location.hash = route;
  };

  const handleScenarioClick = async (scenarioId: string) => {
    console.log('[SCENARIO_CLICK] scenarioId=', scenarioId);
    setIsSeeding(true);
    setSeedError(null);

    try {
      // Map scenario ID to care context configuration
      const contextConfig = getContextConfig(scenarioId);

      // Get or create resident (use fixed showcase resident ID)
      const residentId = 'b0000000-0000-0000-0000-000000000001';

      // Create or update care_context
      const { data: contextData, error: contextError } = await supabase.rpc('create_or_update_care_context', {
        p_resident_id: residentId,
        p_management_mode: contextConfig.management_mode,
        p_care_setting: contextConfig.care_setting,
        p_service_model: contextConfig.service_model,
        p_supervision_enabled: contextConfig.supervision_enabled,
        p_agency_id: contextConfig.agency_id
      });

      if (contextError) {
        console.error('[ShowcaseScenarioSelector] Context creation failed:', contextError);
        setSeedError(`Failed to create care context: ${contextError.message}`);
        setIsSeeding(false);
        return;
      }

      console.log('[SCENARIO_RPC_OK] care_context_id=', contextData);

      // Seed active context based on care_context configuration
      const { data: seedData, error: seedError } = await supabase.rpc('seed_active_context', {
        p_care_context_id: contextData
      });

      if (seedError) {
        console.error('[ShowcaseScenarioSelector] Seed failed:', seedError);
        setSeedError(`Failed to seed data: ${seedError.message}`);
        setIsSeeding(false);
        return;
      }

      console.log('[SCENARIO_SEED_OK]', seedData);

      // Update showcase context state → triggers App.tsx re-render → HostShell
      advanceToNextStep(scenarioId);

      setIsSeeding(false);
    } catch (err: any) {
      console.error('[ShowcaseScenarioSelector] Exception:', err);
      setSeedError(`Error: ${err.message}`);
      setIsSeeding(false);
    }
  };

  const getContextConfig = (scenarioId: string) => {
    const agencyId = 'a0000000-0000-0000-0000-000000000010'; // Fixed showcase agency

    switch (scenarioId) {
      case 'self-managed':
        return {
          management_mode: 'SELF',
          care_setting: 'IN_HOME',
          service_model: 'NONE',
          supervision_enabled: false,
          agency_id: null
        };
      case 'family-managed':
        return {
          management_mode: 'FAMILY_MANAGED',
          care_setting: 'IN_HOME',
          service_model: 'NONE',
          supervision_enabled: false,
          agency_id: null
        };
      case 'direct-hire':
        return {
          management_mode: 'FAMILY_MANAGED',
          care_setting: 'IN_HOME',
          service_model: 'DIRECT_HIRE',
          supervision_enabled: false,
          agency_id: null
        };
      case 'agency-home-care':
        return {
          management_mode: 'AGENCY_MANAGED',
          care_setting: 'IN_HOME',
          service_model: 'AGENCY_HOME_CARE',
          supervision_enabled: true,
          agency_id: agencyId
        };
      case 'agency-facility':
        return {
          management_mode: 'AGENCY_MANAGED',
          care_setting: 'FACILITY',
          service_model: 'AGENCY_FACILITY',
          supervision_enabled: true,
          agency_id: agencyId
        };
      default:
        return {
          management_mode: 'SELF',
          care_setting: 'IN_HOME',
          service_model: 'NONE',
          supervision_enabled: false,
          agency_id: null
        };
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="bg-white border border-gray-200 rounded p-8">
          <div className="text-center mb-10">
            <div className="inline-block bg-yellow-50 border border-yellow-400 rounded px-4 py-2 mb-6">
              <span className="text-xs font-bold text-yellow-800 uppercase tracking-wide">
                Showcase Mode
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              AgeEmpower Showcase
            </h1>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Explore cognitive UI and system intelligence
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Direct Access (Cognitive UI)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleDirectAccess('caregiver-cognitive')}
                className="text-left p-5 border-2 border-blue-300 hover:border-blue-600 transition-colors bg-blue-50"
              >
                <div className="text-base font-bold text-blue-900 mb-2">
                  Caregiver Cognitive View
                </div>
                <div className="text-sm text-blue-800">
                  Situation-first, no tabs, Brain Output visible
                </div>
              </button>

              <button
                onClick={() => handleDirectAccess('supervisor-cognitive')}
                className="text-left p-5 border-2 border-blue-300 hover:border-blue-600 transition-colors bg-blue-50"
              >
                <div className="text-base font-bold text-blue-900 mb-2">
                  Supervisor Cognitive View
                </div>
                <div className="text-sm text-blue-800">
                  Exception-driven, explainable alerts
                </div>
              </button>

              <button
                onClick={() => handleDirectAccess('brain-proof')}
                className="text-left p-5 border-2 border-slate-300 hover:border-slate-600 transition-colors bg-slate-50"
              >
                <div className="text-base font-bold text-slate-900 mb-2">
                  Brain Proof Mode
                </div>
                <div className="text-sm text-slate-800">
                  Evidence-based intelligence verification
                </div>
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Interactive Senior + Family Experience
            </h2>
            <button
              onClick={() => handleScenarioClick('independent-senior-family')}
              disabled={isSeeding}
              className="w-full text-left p-6 border-2 border-gray-500 hover:border-gray-700 transition-colors bg-gradient-to-r from-gray-50 to-pink-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xl font-bold text-gray-900 mb-2">
                    Senior Self-Management + Family Admin Control
                  </div>
                  <div className="text-base text-gray-800 mb-4">
                    Experience the full senior and family interface with AI assistance, medication management, device integration, and family oversight capabilities.
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <div className="font-semibold text-gray-900 mb-1">Senior Features</div>
                      <div className="text-gray-700">Medications, Health Inputs, AI Assistant, SOS, Device Pairing, Appointments</div>
                    </div>
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <div className="font-semibold text-gray-900 mb-1">Family Features</div>
                      <div className="text-gray-700">Care Timeline, Health Monitoring, Medication Interactions, Admin Controls, Notifications</div>
                    </div>
                  </div>
                </div>
                <div className="ml-6 text-4xl">
                  →
                </div>
              </div>
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Select Scenario (A-E: Product Modes)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SHOWCASE_SCENARIOS.map((scenario) => {
                const meta = SCENARIO_META[scenario.id as keyof typeof SCENARIO_META];
                return (
                  <button
                    key={scenario.id}
                    onClick={() => handleScenarioClick(scenario.id)}
                    disabled={isSeeding}
                    className="text-left p-5 border-2 border-gray-300 hover:border-blue-600 transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <h3 className="text-base font-bold text-gray-900 mb-2">
                      {scenario.name}
                    </h3>
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                      {meta.description}
                    </p>

                    <div className="space-y-2 text-xs mb-4">
                      <div>
                        <span className="font-semibold text-gray-900">Decisions: </span>
                        <span className="text-gray-700">{meta.ownsDecisions}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Executes: </span>
                        <span className="text-gray-700">{meta.executesCare}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Supervises: </span>
                        <span className="text-gray-700">{meta.supervises}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs font-medium text-blue-600">
                        Select →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <button
              onClick={() => handleDirectAccess('ai-intelligence')}
              className="w-full text-left p-5 border-2 border-blue-300 hover:border-blue-600 transition-colors bg-gradient-to-r from-blue-50 to-gray-50"
            >
              <div className="text-base font-bold text-blue-900 mb-2">
                AI Intelligence Dashboard
              </div>
              <div className="text-sm text-blue-800">
                Brain reasoning, pattern detection, risk predictions, and explainable AI decisions
              </div>
            </button>

            <button
              onClick={() => handleDirectAccess('operational-reality')}
              className="w-full text-left p-5 border-2 border-green-300 hover:border-green-600 transition-colors bg-green-50"
            >
              <div className="text-base font-bold text-green-900 mb-2">
                Operational Reality Demo
              </div>
              <div className="text-sm text-green-800">
                Five working scenarios: Lookup, Context, Voice, Collision, All Clear
              </div>
            </button>

            <button
              onClick={() => handleDirectAccess('device-integration')}
              className="w-full text-left p-5 border-2 border-gray-300 hover:border-gray-600 transition-colors bg-gray-50"
            >
              <div className="text-base font-bold text-gray-900 mb-2">
                Device & Wearable Integration Demo
              </div>
              <div className="text-sm text-gray-800">
                Complete demonstration with PASS/FAIL verification (10 tests)
              </div>
            </button>
          </div>

          {isSeeding && (
            <div className="p-5 bg-blue-50 border border-blue-200 mb-6">
              <div className="flex items-center">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
                <span className="text-sm font-medium text-blue-900">Creating care context and seeding database...</span>
              </div>
            </div>
          )}

          {seedError && (
            <div className="p-5 bg-red-50 border border-red-200 mb-6">
              <h4 className="font-semibold text-red-900 mb-2">Error</h4>
              <p className="text-sm text-red-800">{seedError}</p>
            </div>
          )}

          <div className="p-5 bg-gray-50 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">
              Showcase Mode Notice
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              All scenarios use real database operations with seeded data. Select a scenario to explore the full system capabilities with realistic workflows and intelligence features.
            </p>
          </div>
        </div>
      </div>

      {/* DEBUG BADGE */}
      <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded text-xs font-mono space-y-1 shadow-lg z-50 max-w-xs">
        <div className="font-bold text-yellow-300 mb-2">🔍 SELECTOR DEBUG</div>
        <div><span className="text-gray-400">currentStep:</span> {currentStep}</div>
        <div><span className="text-gray-400">currentScenario:</span> {currentScenario?.id || 'null'}</div>
        <div><span className="text-gray-400">currentRole:</span> {currentRole || 'null'}</div>
        <div><span className="text-gray-400">selectedResidentId:</span> {selectedResidentId?.slice(0, 8) || 'null'}...</div>
        <div><span className="text-gray-400">currentRoute:</span> {currentRoute || 'empty'}</div>
      </div>
    </div>
  );
}
