import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Step3CompoundIntelligenceTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runVerifier = async () => {
    setLoading(true);
    setResults(null);

    try {
      const showcaseAgencyId = 'a0000000-0000-0000-0000-000000000010';

      const { data, error } = await supabase.rpc('verify_step3_compound_intelligence', {
        p_agency_id: showcaseAgencyId
      });

      if (error) throw error;
      setResults(data);
    } catch (err) {
      console.error('Verifier error:', err);
      setResults({
        overall_status: 'ERROR',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-green-100 text-green-800 border-green-300';
      case 'FAIL': return 'bg-red-100 text-red-800 border-red-300';
      case 'SKIP': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return '✓';
      case 'FAIL': return '✗';
      case 'SKIP': return '⊘';
      default: return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Step 3: Compound Intelligence Verification
          </h1>
          <p className="text-xl text-slate-600">
            Verifies multi-signal correlation, explainability, and cross-scenario support
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Intelligence Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-semibold text-blue-900 mb-2">Correlation Engine</div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Deterministic rule-based (no ML)</li>
                <li>• Multi-signal time windows</li>
                <li>• Confidence scoring</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="font-semibold text-purple-900 mb-2">Explainability</div>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Full reasoning text</li>
                <li>• Contributing signal links</li>
                <li>• Rule ID and logic</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="font-semibold text-green-900 mb-2">Signal Types</div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Medication adherence</li>
                <li>• Vital signs trends</li>
                <li>• Family observations</li>
                <li>• Caregiver task outcomes</li>
              </ul>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="font-semibold text-orange-900 mb-2">Cross-Scenario</div>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Independent Senior + Family</li>
                <li>• Hybrid Home Care</li>
                <li>• Agency-Managed Care</li>
              </ul>
            </div>
          </div>

          <button
            onClick={runVerifier}
            disabled={loading}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl text-xl font-bold transition-all shadow-lg disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></span>
                Running Verification Tests...
              </span>
            ) : (
              'Run Step 3 Verifier'
            )}
          </button>
        </div>

        {results && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-900">Verification Results</h2>
              <div className={`px-6 py-3 rounded-lg border-2 text-xl font-bold ${getStatusColor(results.overall_status)}`}>
                {getStatusIcon(results.overall_status)} {results.overall_status}
              </div>
            </div>

            {results.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-semibold text-red-900 mb-1">Error</div>
                <div className="text-red-800">{results.error}</div>
              </div>
            )}

            {results.checks && (
              <div className="space-y-4">
                {results.checks.map((check: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getStatusColor(check.status)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl font-bold">
                            {getStatusIcon(check.status)}
                          </span>
                          <span className="text-lg font-bold">
                            {check.check.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-medium mb-1">{check.message}</div>
                        {check.event_id && (
                          <div className="text-xs opacity-75 mt-2">
                            Event ID: {check.event_id}
                          </div>
                        )}
                        {check.events_created !== undefined && (
                          <div className="text-xs opacity-75 mt-2">
                            Events Created: {check.events_created}
                          </div>
                        )}
                        {check.sources && (
                          <div className="text-xs opacity-75 mt-2">
                            Signal Sources: {JSON.stringify(check.sources)}
                          </div>
                        )}
                        {check.details && (
                          <details className="mt-2">
                            <summary className="text-xs cursor-pointer hover:underline">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-black bg-opacity-10 p-2 rounded overflow-auto">
                              {JSON.stringify(check.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.test_resident_id && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm">
                <div className="font-semibold text-slate-900 mb-2">Test Context</div>
                <div className="text-slate-700 space-y-1">
                  <div>Agency ID: {results.agency_id}</div>
                  <div>Test Resident: {results.test_resident_id}</div>
                  <div>Executed: {new Date(results.executed_at).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
