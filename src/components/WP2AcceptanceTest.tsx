import React, { useState } from 'react';
import { runWP2SpeedRun } from '../services/wp2ScenarioRunner';
import type { WP2ScenarioResult } from '../services/wp2ScenarioRunner';

interface WP2AcceptanceTestProps {
  agencyId: string;
}

export function WP2AcceptanceTest({ agencyId }: WP2AcceptanceTestProps) {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<WP2ScenarioResult | null>(null);

  const handleExecute = async () => {
    setExecuting(true);
    setResult(null);

    try {
      const scenarioResult = await runWP2SpeedRun(agencyId);
      setResult(scenarioResult);
    } catch (error) {
      console.error('Scenario execution error:', error);
      setResult({
        scenarioName: 'WP2: Caregiver Speed Run',
        passed: false,
        steps: [
          {
            name: 'Scenario Initialization',
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        overallMetrics: {
          totalTasks: 0,
          avgTaps: 0,
          avgTyping: 0,
          avgSeconds: 0,
          oneTapPercentage: 0,
          zeroTypingPercentage: 0,
          under30sPercentage: 0,
          voiceExtractionTypes: 0,
        },
        totalTime: 0,
      });
    }

    setExecuting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          WP2 Acceptance Test: Caregiver Speed Run
        </h2>
        <p className="text-sm text-gray-600">
          Quantitative proof of tap-first + voice-first efficiency
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-blue-900 mb-2">What This Test Does</h3>
          <p className="text-sm text-blue-800 mb-3">
            Executes real operations to prove WP2 delivers quantitative efficiency gains:
          </p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Complete 10 routine tasks using quick-tap (records telemetry)</li>
            <li>Complete 1 exception case with full documentation</li>
            <li>Process 3 voice recordings with structured extraction</li>
            <li>Verify metrics meet WP2 acceptance criteria</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-900 mb-2">
            WP2 Acceptance Criteria
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>✓ ≥90% of routine tasks completed with ≤1 tap</li>
            <li>✓ ≥90% of routine tasks completed with 0 typing</li>
            <li>✓ ≥90% of routine tasks completed in ≤30 seconds</li>
            <li>✓ ≥3 voice extraction types demonstrated</li>
            <li>✓ Exception cases require evidence + documentation</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleExecute}
            disabled={executing}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {executing ? 'Executing Speed Run...' : 'Execute WP2 Speed Run'}
          </button>

          {result && (
            <button
              onClick={() => setResult(null)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Clear Results
            </button>
          )}
        </div>

        {result && (
          <div className="space-y-6">
            <div
              className={`border-2 rounded-lg p-6 ${
                result.passed
                  ? 'bg-green-50 border-green-500'
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${
                    result.passed
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {result.passed ? '✓' : '✗'}
                </div>
                <div>
                  <h3
                    className={`text-2xl font-bold ${
                      result.passed ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {result.passed
                      ? 'WP2 ACCEPTANCE: PASS'
                      : 'WP2 ACCEPTANCE: FAIL'}
                  </h3>
                  <p
                    className={`text-sm ${
                      result.passed ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    Execution time: {result.totalTime}ms
                  </p>
                </div>
              </div>

              {result.passed ? (
                <div className="bg-white border border-green-200 rounded p-4">
                  <p className="text-sm text-green-900 font-medium">
                    All WP2 capabilities executed successfully with quantitative proof.
                    Caregiver efficiency layer meets acceptance criteria.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-red-200 rounded p-4">
                  <p className="text-sm text-red-900 font-medium">
                    One or more WP2 criteria failed. Review metrics below. WP2 does
                    not meet acceptance criteria until all metrics pass.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Quantitative Metrics
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Avg Taps"
                  value={result.overallMetrics.avgTaps.toFixed(2)}
                  target="≤1"
                  passed={result.overallMetrics.oneTapPercentage >= 90}
                />
                <MetricCard
                  label="Avg Typing"
                  value={`${result.overallMetrics.avgTyping.toFixed(0)} chars`}
                  target="0"
                  passed={result.overallMetrics.zeroTypingPercentage >= 90}
                />
                <MetricCard
                  label="Avg Time"
                  value={`${result.overallMetrics.avgSeconds.toFixed(1)}s`}
                  target="≤30s"
                  passed={result.overallMetrics.under30sPercentage >= 90}
                />
                <MetricCard
                  label="Voice Extractions"
                  value={result.overallMetrics.voiceExtractionTypes.toString()}
                  target="≥3"
                  passed={result.overallMetrics.voiceExtractionTypes >= 3}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <PercentageCard
                  label="≤1 Tap"
                  percentage={result.overallMetrics.oneTapPercentage}
                  target={90}
                />
                <PercentageCard
                  label="0 Typing"
                  percentage={result.overallMetrics.zeroTypingPercentage}
                  target={90}
                />
                <PercentageCard
                  label="≤30 Seconds"
                  percentage={result.overallMetrics.under30sPercentage}
                  target={90}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900">
                Execution Steps ({result.steps.filter((s) => s.passed).length}/
                {result.steps.length} passed)
              </h3>

              {result.steps.map((step, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    step.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                        step.passed
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {step.passed ? '✓' : '✗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{step.name}</h4>
                      {step.error && (
                        <div className="bg-white border border-red-300 rounded p-3 mt-2">
                          <p className="text-xs font-mono text-red-700">
                            {step.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {result.passed && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-2">
                  ✓ WP2 Acceptance Criteria Met
                </h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>✓ Top 10 routine tasks: ≤1 tap, 0 typing, ≤30s median</li>
                  <li>✓ Exception-only documentation enforced</li>
                  <li>✓ Voice pipeline demonstrates 3+ extraction types</li>
                  <li>✓ Real telemetry captured for all completions</li>
                  <li>✓ Evidence quality scoring applied</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  target,
  passed,
}: {
  label: string;
  value: string;
  target: string;
  passed: boolean;
}) {
  return (
    <div className={`border-2 rounded-lg p-4 ${passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${passed ? 'text-green-900' : 'text-red-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-600 mt-1">Target: {target}</p>
    </div>
  );
}

function PercentageCard({
  label,
  percentage,
  target,
}: {
  label: string;
  percentage: number;
  target: number;
}) {
  const passed = percentage >= target;
  return (
    <div className={`border-2 rounded-lg p-4 ${passed ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${passed ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-2">Target: ≥{target}%</p>
    </div>
  );
}
