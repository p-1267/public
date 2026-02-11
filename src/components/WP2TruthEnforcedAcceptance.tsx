import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CapabilityVerifier } from '../services/capabilityVerifier';
import { heuristicExtractor } from '../services/heuristicExtraction';

interface WP2TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'pending';
  evidence: string;
  details?: any;
}

export function WP2TruthEnforcedAcceptance({ agencyId }: { agencyId: string }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<WP2TestResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'pass' | 'fail' | 'pending'>('pending');

  const runFullAcceptanceTest = async () => {
    setTesting(true);
    const testResults: WP2TestResult[] = [];

    try {
      // TEST 1: CapabilityVerifier shows WP2 tests passing
      testResults.push(await testCapabilityVerifier());

      // TEST 2: Voice extraction produces structured outputs
      testResults.push(await testVoiceExtraction());

      // TEST 3: Backend exception enforcement works
      testResults.push(await testBackendEnforcement());

      // TEST 4: Heuristic extractor is properly labeled
      testResults.push(await testHeuristicLabeling());

      // TEST 5: Telemetry metrics meet ≥90% threshold
      testResults.push(await testTelemetryMetrics());

      setResults(testResults);

      // Determine overall status
      const allPass = testResults.every(r => r.status === 'pass');
      setOverallStatus(allPass ? 'pass' : 'fail');

    } catch (error) {
      console.error('Acceptance test error:', error);
      setOverallStatus('fail');
    } finally {
      setTesting(false);
    }
  };

  const testCapabilityVerifier = async (): Promise<WP2TestResult> => {
    try {
      const verifier = new CapabilityVerifier(agencyId);
      const report = await verifier.verifyAll();

      const wp2Category = report.categories['caregiver_efficiency'];

      if (!wp2Category) {
        return {
          testName: 'CapabilityVerifier WP2 Tests',
          status: 'fail',
          evidence: 'No WP2 category found in CapabilityVerifier',
        };
      }

      const allPass = wp2Category.capabilities.every(c => c.implemented);
      const passCount = wp2Category.capabilities.filter(c => c.implemented).length;
      const totalCount = wp2Category.capabilities.length;

      return {
        testName: 'CapabilityVerifier WP2 Tests',
        status: allPass ? 'pass' : 'fail',
        evidence: `${passCount}/${totalCount} WP2 tests passing (${wp2Category.percentage}%)`,
        details: wp2Category.capabilities,
      };
    } catch (error) {
      return {
        testName: 'CapabilityVerifier WP2 Tests',
        status: 'fail',
        evidence: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  };

  const testVoiceExtraction = async (): Promise<WP2TestResult> => {
    try {
      // Test all 5 extraction types
      const extractionTypes = ['medication', 'vital_signs', 'incident_note', 'adl', 'meal'] as const;
      const mockTranscriptions = {
        medication: 'Patient took metformin 500mg by mouth at 8am',
        vital_signs: 'Blood pressure 120 over 80, pulse 72',
        incident_note: 'Patient had a fall in the bathroom at 3pm',
        adl: 'Patient bathed with assist',
        meal: 'Patient ate 75% of breakfast',
      };

      const results = await Promise.all(
        extractionTypes.map(async (type) => {
          const result = await heuristicExtractor.extract({
            transcription: mockTranscriptions[type],
            extractionType: type,
          });

          return {
            type,
            extracted: result.extractedData,
            confidence: result.confidence,
            method: result.extractionMethod,
          };
        })
      );

      // Verify all extractions produced data
      const allSuccessful = results.every(
        r => Object.values(r.extracted).some(v => v !== null && v !== 'unknown')
      );

      // Verify extraction method is labeled correctly
      const correctlyLabeled = results.every(r => r.method === 'heuristic_v1');

      return {
        testName: 'Voice-to-Structure Pipeline',
        status: allSuccessful && correctlyLabeled ? 'pass' : 'fail',
        evidence: `${results.length}/5 extraction types successful, method: ${results[0].method}`,
        details: results,
      };
    } catch (error) {
      return {
        testName: 'Voice-to-Structure Pipeline',
        status: 'fail',
        evidence: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  };

  const testBackendEnforcement = async (): Promise<WP2TestResult> => {
    try {
      // Get a task to test with
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('state', 'scheduled')
        .limit(1);

      if (!tasks || tasks.length === 0) {
        return {
          testName: 'Backend Exception Enforcement',
          status: 'fail',
          evidence: 'No test task available',
        };
      }

      const taskId = tasks[0].id;

      // Try to quick-tap with exception value (should be rejected)
      try {
        const { error } = await supabase.rpc('quick_tap_complete_task', {
          p_task_id: taskId,
          p_outcome: 'success',
          p_quick_value: 'refused', // Exception value
        });

        if (error && error.message.includes('EXCEPTION_REQUIRES_FULL_DOCUMENTATION')) {
          return {
            testName: 'Backend Exception Enforcement',
            status: 'pass',
            evidence: 'Backend correctly rejected exception value with error',
            details: { errorMessage: error.message },
          };
        } else if (error) {
          return {
            testName: 'Backend Exception Enforcement',
            status: 'fail',
            evidence: `Backend error but wrong message: ${error.message}`,
          };
        } else {
          return {
            testName: 'Backend Exception Enforcement',
            status: 'fail',
            evidence: 'Backend ALLOWED exception value (CRITICAL FAILURE)',
          };
        }
      } catch (error) {
        return {
          testName: 'Backend Exception Enforcement',
          status: 'fail',
          evidence: `Test error: ${error instanceof Error ? error.message : 'Unknown'}`,
        };
      }
    } catch (error) {
      return {
        testName: 'Backend Exception Enforcement',
        status: 'fail',
        evidence: `Setup error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  };

  const testHeuristicLabeling = async (): Promise<WP2TestResult> => {
    try {
      // Test that extractor identifies itself correctly
      const result = await heuristicExtractor.extract({
        transcription: 'test',
        extractionType: 'medication',
      });

      const correctlyLabeled = result.extractionMethod === 'heuristic_v1';
      const hasReasoning = result.reasoning && result.reasoning.includes('Heuristic extraction');

      if (!correctlyLabeled) {
        return {
          testName: 'Honest Heuristic Labeling',
          status: 'fail',
          evidence: `Extractor identifies as: ${result.extractionMethod} (should be heuristic_v1)`,
        };
      }

      if (!hasReasoning) {
        return {
          testName: 'Honest Heuristic Labeling',
          status: 'fail',
          evidence: 'Reasoning does not mention heuristic extraction',
        };
      }

      return {
        testName: 'Honest Heuristic Labeling',
        status: 'pass',
        evidence: 'Extractor correctly labeled as heuristic_v1 (not LLM)',
        details: { method: result.extractionMethod, reasoning: result.reasoning },
      };
    } catch (error) {
      return {
        testName: 'Honest Heuristic Labeling',
        status: 'fail',
        evidence: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  };

  const testTelemetryMetrics = async (): Promise<WP2TestResult> => {
    try {
      // Query actual telemetry data
      const { data: telemetry, error } = await supabase
        .from('task_completion_telemetry')
        .select('tap_count, character_count, completion_seconds, was_exception')
        .eq('agency_id', agencyId)
        .eq('completion_method', 'quick_tap');

      if (error || !telemetry || telemetry.length === 0) {
        return {
          testName: 'Telemetry Metrics (≥90%)',
          status: 'fail',
          evidence: 'No telemetry data found',
        };
      }

      const total = telemetry.length;
      const oneTapCount = telemetry.filter(t => t.tap_count <= 1).length;
      const zeroTypingCount = telemetry.filter(t => t.character_count === 0).length;
      const under30sCount = telemetry.filter(t => t.completion_seconds <= 30).length;

      const oneTapPct = (oneTapCount / total) * 100;
      const zeroTypingPct = (zeroTypingCount / total) * 100;
      const under30sPct = (under30sCount / total) * 100;

      const meetsThreshold = oneTapPct >= 90 && zeroTypingPct >= 90 && under30sPct >= 90;

      return {
        testName: 'Telemetry Metrics (≥90%)',
        status: meetsThreshold ? 'pass' : 'fail',
        evidence: `Taps: ${oneTapPct.toFixed(1)}%, Typing: ${zeroTypingPct.toFixed(1)}%, Time: ${under30sPct.toFixed(1)}%`,
        details: {
          total,
          oneTapPct,
          zeroTypingPct,
          under30sPct,
        },
      };
    } catch (error) {
      return {
        testName: 'Telemetry Metrics (≥90%)',
        status: 'fail',
        evidence: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          WP2: Truth-Enforced Acceptance Test
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          This test validates WP2 meets truth-enforcement standards with quantitative proof
        </p>

        <button
          onClick={runFullAcceptanceTest}
          disabled={testing}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? 'Running Tests...' : 'Run WP2 Acceptance Test'}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div
            className={`rounded-lg shadow-sm border-2 p-6 ${
              overallStatus === 'pass'
                ? 'bg-green-50 border-green-500'
                : 'bg-red-50 border-red-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`text-3xl ${
                  overallStatus === 'pass' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {overallStatus === 'pass' ? '✓' : '✗'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  WP2 Acceptance: {overallStatus === 'pass' ? 'PASS' : 'FAIL'}
                </h3>
                <p className="text-sm text-gray-600">
                  {results.filter(r => r.status === 'pass').length}/{results.length} tests passed
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`text-xl font-bold mt-1 ${
                      result.status === 'pass' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.status === 'pass' ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{result.testName}</h4>
                    <p className="text-sm text-gray-600 mt-1">{result.evidence}</p>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                          Show details
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">WP2 Acceptance Criteria</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ CapabilityVerifier shows WP2 tests PASS (independent of scenarios)</li>
              <li>✓ Voice extraction produces ≥3 structured output types</li>
              <li>✓ Backend RPC rejects exception values with proper error</li>
              <li>✓ Extraction method honestly labeled as "heuristic_v1" (not LLM)</li>
              <li>✓ Telemetry metrics meet ≥90% threshold for taps/typing/time</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
