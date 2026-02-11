import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ScenarioStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: any;
}

interface VerificationCheck {
  check: string;
  expected: any;
  actual: any;
  passed: boolean;
}

interface VerificationResult {
  scenario: string;
  total_checks: number;
  passed: number;
  failed: number;
  success: boolean;
  verdict: 'PASS' | 'FAIL';
  checks: VerificationCheck[];
  timestamp: string;
}

export function ShowcaseSeniorFamilyScenario() {
  const [steps, setSteps] = useState<ScenarioStep[]>([
    {
      id: 'seed',
      title: '1. Seed Scenario Data',
      description: 'Create senior user, family admin, resident, medications, appointments',
      status: 'pending'
    },
    {
      id: 'verify_setup',
      title: '2. Verify Data Setup',
      description: 'Confirm all data was created correctly',
      status: 'pending'
    },
    {
      id: 'test_self_manage',
      title: '3. Test SELF_MANAGE Mode',
      description: 'Verify senior can access their own data',
      status: 'pending'
    },
    {
      id: 'switch_family_admin',
      title: '4. Switch to FAMILY_ADMIN Mode',
      description: 'Change operating mode to allow family management',
      status: 'pending'
    },
    {
      id: 'test_family_control',
      title: '5. Test Family Admin Control',
      description: 'Verify family can manage medications and appointments',
      status: 'pending'
    },
    {
      id: 'switch_back',
      title: '6. Switch Back to SELF_MANAGE',
      description: 'Return control to senior',
      status: 'pending'
    },
    {
      id: 'final_verification',
      title: '7. Final Verification',
      description: 'Run complete truth-enforced verification',
      status: 'pending'
    }
  ]);

  const [scenarioData, setScenarioData] = useState<any>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const updateStepStatus = (stepId: string, status: ScenarioStep['status'], result?: any) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status, result } : step
      )
    );
  };

  const runScenario = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    try {
      // Step 1: Seed data
      updateStepStatus('seed', 'running');
      const { data: seedData, error: seedError } = await supabase.rpc('seed_senior_family_scenario');

      if (seedError) {
        updateStepStatus('seed', 'failed', { error: seedError.message });
        setIsRunning(false);
        return;
      }

      setScenarioData(seedData);
      updateStepStatus('seed', 'success', seedData);
      await sleep(1000);

      // Step 2: Verify setup
      setCurrentStep(1);
      updateStepStatus('verify_setup', 'running');
      const { data: medications } = await supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', seedData.resident_id)
        .eq('status', 'ACTIVE');

      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('resident_id', seedData.resident_id);

      if (!medications || medications.length < 2) {
        updateStepStatus('verify_setup', 'failed', {
          error: 'Medications not created properly',
          count: medications?.length || 0
        });
        setIsRunning(false);
        return;
      }

      updateStepStatus('verify_setup', 'success', {
        medications: medications.length,
        appointments: appointments?.length || 0
      });
      await sleep(1000);

      // Step 3: Test SELF_MANAGE mode
      setCurrentStep(2);
      updateStepStatus('test_self_manage', 'running');
      const { data: currentMode } = await supabase.rpc('get_resident_operating_mode', {
        p_resident_id: seedData.resident_id
      });

      if (currentMode !== 'SELF_MANAGE') {
        updateStepStatus('test_self_manage', 'failed', {
          error: 'Expected SELF_MANAGE mode',
          actual: currentMode
        });
        setIsRunning(false);
        return;
      }

      updateStepStatus('test_self_manage', 'success', { mode: currentMode });
      await sleep(1000);

      // Step 4: Switch to FAMILY_ADMIN
      setCurrentStep(3);
      updateStepStatus('switch_family_admin', 'running');
      const { error: switchError } = await supabase.rpc('set_resident_operating_mode', {
        p_resident_id: seedData.resident_id,
        p_mode: 'FAMILY_ADMIN',
        p_reason: 'Showcase scenario testing'
      });

      if (switchError) {
        updateStepStatus('switch_family_admin', 'failed', { error: switchError.message });
        setIsRunning(false);
        return;
      }

      const { data: newMode } = await supabase.rpc('get_resident_operating_mode', {
        p_resident_id: seedData.resident_id
      });

      if (newMode !== 'FAMILY_ADMIN') {
        updateStepStatus('switch_family_admin', 'failed', {
          error: 'Mode switch failed',
          actual: newMode
        });
        setIsRunning(false);
        return;
      }

      updateStepStatus('switch_family_admin', 'success', { mode: newMode });
      await sleep(1000);

      // Step 5: Test family admin control
      setCurrentStep(4);
      updateStepStatus('test_family_control', 'running');
      const { data: hasControl } = await supabase.rpc('check_family_admin_control', {
        p_user_id: seedData.family_user_id,
        p_resident_id: seedData.resident_id
      });

      if (!hasControl) {
        updateStepStatus('test_family_control', 'failed', {
          error: 'Family admin does not have control in FAMILY_ADMIN mode'
        });
        setIsRunning(false);
        return;
      }

      updateStepStatus('test_family_control', 'success', { hasControl });
      await sleep(1000);

      // Step 6: Switch back to SELF_MANAGE
      setCurrentStep(5);
      updateStepStatus('switch_back', 'running');
      await supabase.rpc('set_resident_operating_mode', {
        p_resident_id: seedData.resident_id,
        p_mode: 'SELF_MANAGE',
        p_reason: 'Returning control to senior'
      });

      const { data: finalMode } = await supabase.rpc('get_resident_operating_mode', {
        p_resident_id: seedData.resident_id
      });

      if (finalMode !== 'SELF_MANAGE') {
        updateStepStatus('switch_back', 'failed', {
          error: 'Failed to return to SELF_MANAGE',
          actual: finalMode
        });
        setIsRunning(false);
        return;
      }

      updateStepStatus('switch_back', 'success', { mode: finalMode });
      await sleep(1000);

      // Step 7: Final verification
      setCurrentStep(6);
      updateStepStatus('final_verification', 'running');
      const { data: verifyResult, error: verifyError } = await supabase.rpc('verify_senior_family_scenario');

      if (verifyError) {
        updateStepStatus('final_verification', 'failed', { error: verifyError.message });
        setIsRunning(false);
        return;
      }

      setVerification(verifyResult);
      updateStepStatus('final_verification', verifyResult.success ? 'success' : 'failed', verifyResult);

    } catch (err: any) {
      console.error('Scenario execution error:', err);
      updateStepStatus(steps[currentStep]?.id || 'unknown', 'failed', { error: err.message });
    } finally {
      setIsRunning(false);
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const resetScenario = () => {
    setSteps(steps.map(step => ({ ...step, status: 'pending', result: undefined })));
    setScenarioData(null);
    setVerification(null);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-12">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              Independent Senior + Family Admin
            </h1>
            <p className="text-3xl text-gray-600 mb-2">
              Automated Showcase Scenario
            </p>
            <p className="text-2xl text-gray-500">
              Truth-Enforced • End-to-End • PASS/FAIL Verified
            </p>
          </div>

          <div className="flex gap-6 mb-12">
            <button
              onClick={runScenario}
              disabled={isRunning}
              className={`flex-1 py-6 px-8 rounded-2xl text-3xl font-bold text-white transition-all ${
                isRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isRunning ? '⏳ Running Scenario...' : '▶️ Run Complete Scenario'}
            </button>
            <button
              onClick={resetScenario}
              disabled={isRunning}
              className="px-8 py-6 rounded-2xl text-3xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all disabled:opacity-50"
            >
              🔄 Reset
            </button>
          </div>

          <div className="space-y-6 mb-12">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`p-8 rounded-2xl border-2 transition-all ${
                  step.status === 'success'
                    ? 'bg-green-50 border-green-500'
                    : step.status === 'failed'
                    ? 'bg-red-50 border-red-500'
                    : step.status === 'running'
                    ? 'bg-blue-50 border-blue-500 animate-pulse'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-3xl font-bold text-gray-900">{step.title}</h3>
                  <div className="flex items-center gap-3">
                    {step.status === 'success' && (
                      <span className="text-5xl">✅</span>
                    )}
                    {step.status === 'failed' && (
                      <span className="text-5xl">❌</span>
                    )}
                    {step.status === 'running' && (
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    )}
                    {step.status === 'pending' && (
                      <span className="text-5xl text-gray-400">⏸️</span>
                    )}
                  </div>
                </div>
                <p className="text-2xl text-gray-700 mb-4">{step.description}</p>
                {step.result && (
                  <div className="mt-4 p-6 bg-white rounded-xl">
                    <pre className="text-lg text-gray-800 overflow-auto">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {verification && (
            <div
              className={`p-12 rounded-3xl border-4 ${
                verification.verdict === 'PASS'
                  ? 'bg-green-50 border-green-600'
                  : 'bg-red-50 border-red-600'
              }`}
            >
              <div className="text-center mb-8">
                <h2 className="text-7xl font-bold mb-6">
                  {verification.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL'}
                </h2>
                <p className="text-4xl font-semibold text-gray-900 mb-4">
                  {verification.scenario}
                </p>
                <div className="flex justify-center gap-8 text-3xl">
                  <span className="text-green-600 font-bold">
                    ✓ {verification.passed} Passed
                  </span>
                  <span className="text-red-600 font-bold">
                    ✗ {verification.failed} Failed
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {verification.checks.map((check, index) => (
                  <div
                    key={index}
                    className={`p-6 rounded-xl ${
                      check.passed ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-2xl font-semibold text-gray-900 mb-2">
                          {check.passed ? '✅' : '❌'} {check.check}
                        </h4>
                        <div className="text-xl text-gray-700">
                          <div>Expected: <span className="font-mono">{JSON.stringify(check.expected)}</span></div>
                          <div>Actual: <span className="font-mono">{JSON.stringify(check.actual)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
