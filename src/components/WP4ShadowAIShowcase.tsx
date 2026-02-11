/**
 * WP4: Shadow AI (Continuous Learning) Showcase
 *
 * Demonstrates:
 * - Language learning from voice corrections
 * - Alert noise reduction from supervisor feedback
 * - Baseline drift detection and adaptation
 * - Outcome feedback for prediction calibration
 * - Governance (rollback, freeze, inspect)
 *
 * Acceptance Criteria:
 * - Learning effects appear ONLY after repeated runs
 * - Metrics prove improvement (before vs after)
 * - Rollback restores previous behavior
 * - All learning is logged and inspectable
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LearningStats {
  language: {
    total_corrections: number;
    high_confidence_corrections: number;
    average_confidence: number;
    learning_active: boolean;
  };
  alerts: {
    total_feedback: number;
    threshold_adjustments: number;
    alert_types_learned: number;
    average_usefulness: number;
    learning_active: boolean;
  };
  baselines: {
    total_proposals: number;
    applied_proposals: number;
    pending_proposals: number;
    learning_active: boolean;
  };
  outcomes: {
    total_outcomes: number;
    calibrations: number;
    average_accuracy: number;
    prediction_types_learned: number;
    learning_active: boolean;
  };
}

interface LearningSystemStatus {
  learning_enabled: boolean;
  is_frozen: boolean;
  frozen_until: string | null;
  frozen_reason: string | null;
  total_learning_events: number;
  last_learning_event_at: string | null;
  rollback_count: number;
  last_rollback_at: string | null;
  stats_by_domain: Record<string, any>;
}

export function WP4ShadowAIShowcase({ agencyId }: { agencyId: string }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<LearningSystemStatus | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [learningChanges, setLearningChanges] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  useEffect(() => {
    loadLearningStats();
    loadSystemStatus();
  }, [agencyId]);

  const loadLearningStats = async () => {
    try {
      const [language, alerts, baselines, outcomes] = await Promise.all([
        supabase.rpc('get_language_learning_stats', { p_agency_id: agencyId }),
        supabase.rpc('get_alert_learning_stats', { p_agency_id: agencyId }),
        supabase.rpc('get_baseline_learning_stats', { p_agency_id: agencyId }),
        supabase.rpc('get_outcome_learning_stats', { p_agency_id: agencyId }),
      ]);

      setStats({
        language: language.data || {},
        alerts: alerts.data || {},
        baselines: baselines.data || {},
        outcomes: outcomes.data || {},
      });
    } catch (error: any) {
      console.error('Error loading learning stats:', error);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_learning_system_status', {
        p_agency_id: agencyId,
      });

      if (error) throw error;
      setSystemStatus(data);
    } catch (error: any) {
      console.error('Error loading system status:', error);
    }
  };

  const loadLearningChanges = async (domain: string = 'all') => {
    try {
      const { data, error } = await supabase.rpc('inspect_learning_changes', {
        p_agency_id: agencyId,
        p_learning_domain: domain === 'all' ? null : domain,
        p_limit: 50,
      });

      if (error) throw error;
      setLearningChanges(data || []);
    } catch (error: any) {
      console.error('Error loading learning changes:', error);
    }
  };

  const seedScenario = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('seed_wp4_acceptance_scenario', {
        p_agency_id: agencyId,
      });

      if (error) throw error;
      alert(`Scenario seeded:\n${JSON.stringify(data, null, 2)}`);
      await loadLearningStats();
      await loadSystemStatus();
    } catch (error: any) {
      alert(`Error seeding scenario: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runVerification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_wp4_shadow_ai', {
        p_agency_id: agencyId,
      });

      if (error) throw error;
      setVerificationResult(data);
      alert(`Verification complete:\n${JSON.stringify(data, null, 2)}`);
      await loadLearningStats();
      await loadSystemStatus();
    } catch (error: any) {
      alert(`Error running verification: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAllLearning = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('run_all_learning', {
        p_agency_id: agencyId,
      });

      if (error) throw error;
      alert(`Learning complete:\n${JSON.stringify(data, null, 2)}`);
      await loadLearningStats();
      await loadSystemStatus();
    } catch (error: any) {
      alert(`Error running learning: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const rollbackLearning = async (count: number, domain: string | null) => {
    if (!confirm(`Rollback ${count} learning changes${domain ? ` in ${domain}` : ''}?`)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rollback_learning', {
        p_agency_id: agencyId,
        p_rollback_count: count,
        p_rollback_domain: domain,
      });

      if (error) throw error;
      alert(`Rollback complete:\n${JSON.stringify(data, null, 2)}`);
      await loadLearningStats();
      await loadSystemStatus();
      await loadLearningChanges(selectedDomain);
    } catch (error: any) {
      alert(`Error rolling back: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const freezeLearning = async (hours: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('freeze_learning', {
        p_agency_id: agencyId,
        p_freeze_duration_hours: hours,
        p_freeze_reason: 'Manual freeze from showcase',
      });

      if (error) throw error;
      alert(`Learning frozen:\n${JSON.stringify(data, null, 2)}`);
      await loadSystemStatus();
    } catch (error: any) {
      alert(`Error freezing learning: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const unfreezeLearning = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('unfreeze_learning', {
        p_agency_id: agencyId,
      });

      if (error) throw error;
      alert(`Learning unfrozen:\n${JSON.stringify(data, null, 2)}`);
      await loadSystemStatus();
    } catch (error: any) {
      alert(`Error unfreezing learning: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getAcceptanceStatus = () => {
    if (!verificationResult) return null;

    const passed = verificationResult.overall_status === 'PASS';
    const testsRun = verificationResult.tests_run;
    const testsPassed = verificationResult.tests_passed;

    return { passed, testsRun, testsPassed };
  };

  const acceptance = getAcceptanceStatus();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          WP4: Shadow AI (Continuous Learning) - TRUTH ENFORCED
        </h1>
        <p className="text-gray-600">
          Shadow AI learns from feedback over time - NEVER acts directly
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-blue-50 rounded-lg shadow-sm border-2 border-blue-500 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Learning Controls</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedScenario}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Seeding...' : '1. Seed Scenario'}
          </button>
          <button
            onClick={runAllLearning}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Learning...' : '2. Run All Learning'}
          </button>
          <button
            onClick={runVerification}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Verifying...' : '3. Run Verification'}
          </button>
          <button
            onClick={() => rollbackLearning(1, null)}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
          >
            Rollback Last Change
          </button>
          {systemStatus?.is_frozen ? (
            <button
              onClick={unfreezeLearning}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
            >
              Unfreeze Learning
            </button>
          ) : (
            <button
              onClick={() => freezeLearning(24)}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
            >
              Freeze Learning (24h)
            </button>
          )}
          <button
            onClick={() => loadLearningChanges(selectedDomain)}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
          >
            Inspect Changes
          </button>
        </div>
      </div>

      {/* Acceptance Status */}
      {acceptance && (
        <div className={`rounded-lg shadow-sm border-2 p-6 ${acceptance.passed ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`text-3xl ${acceptance.passed ? 'text-green-600' : 'text-red-600'}`}>
              {acceptance.passed ? '✓' : '✗'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                WP4 Acceptance: {acceptance.passed ? 'PASS' : 'FAIL'}
              </h2>
              <p className="text-sm text-gray-600">
                Tests: {acceptance.testsPassed} / {acceptance.testsRun} passed
              </p>
            </div>
          </div>
          {verificationResult.test_results && (
            <div className="space-y-2">
              {verificationResult.test_results.map((test: any, idx: number) => (
                <div key={idx} className={`p-3 rounded ${test.status === 'PASS' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{test.status}</span>
                    <span className="text-sm">{test.test_name}</span>
                  </div>
                  <div className="text-xs mt-1">{test.message}</div>
                  {test.proof && (
                    <div className="text-xs mt-1 font-mono text-green-700">✓ {test.proof}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Status */}
      {systemStatus && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">System Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded ${systemStatus.learning_enabled ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-sm text-gray-600">Learning Enabled</div>
              <div className="text-2xl font-bold">{systemStatus.learning_enabled ? 'Yes' : 'No'}</div>
            </div>
            <div className={`p-4 rounded ${systemStatus.is_frozen ? 'bg-yellow-50' : 'bg-green-50'}`}>
              <div className="text-sm text-gray-600">Frozen</div>
              <div className="text-2xl font-bold">{systemStatus.is_frozen ? 'Yes' : 'No'}</div>
              {systemStatus.frozen_until && (
                <div className="text-xs text-gray-500">Until: {new Date(systemStatus.frozen_until).toLocaleString()}</div>
              )}
            </div>
            <div className="p-4 rounded bg-blue-50">
              <div className="text-sm text-gray-600">Total Learning Events</div>
              <div className="text-2xl font-bold">{systemStatus.total_learning_events}</div>
            </div>
            <div className="p-4 rounded bg-orange-50">
              <div className="text-sm text-gray-600">Rollback Count</div>
              <div className="text-2xl font-bold">{systemStatus.rollback_count}</div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Statistics */}
      {stats && (
        <div className="grid grid-cols-2 gap-6">
          {/* Language Learning */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">1. Language Learning</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Corrections:</span>
                <span className="font-bold">{stats.language.total_corrections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High Confidence:</span>
                <span className="font-bold">{stats.language.high_confidence_corrections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Confidence:</span>
                <span className="font-bold">{(stats.language.average_confidence * 100).toFixed(0)}%</span>
              </div>
              <div className={`mt-2 p-2 rounded ${stats.language.learning_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-semibold">
                  {stats.language.learning_active ? '✓ Learning Active' : 'No Learning Yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Alert Learning */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">2. Alert Learning</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Feedback:</span>
                <span className="font-bold">{stats.alerts.total_feedback}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Threshold Adjustments:</span>
                <span className="font-bold">{stats.alerts.threshold_adjustments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Alert Types Learned:</span>
                <span className="font-bold">{stats.alerts.alert_types_learned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Usefulness:</span>
                <span className="font-bold">{(stats.alerts.average_usefulness * 100).toFixed(0)}%</span>
              </div>
              <div className={`mt-2 p-2 rounded ${stats.alerts.learning_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-semibold">
                  {stats.alerts.learning_active ? '✓ Learning Active' : 'No Learning Yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Baseline Learning */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">3. Baseline Learning</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Proposals:</span>
                <span className="font-bold">{stats.baselines.total_proposals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Applied Proposals:</span>
                <span className="font-bold">{stats.baselines.applied_proposals}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Proposals:</span>
                <span className="font-bold">{stats.baselines.pending_proposals}</span>
              </div>
              <div className={`mt-2 p-2 rounded ${stats.baselines.learning_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-semibold">
                  {stats.baselines.learning_active ? '✓ Learning Active' : 'No Learning Yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Outcome Learning */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">4. Outcome Learning</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Outcomes:</span>
                <span className="font-bold">{stats.outcomes.total_outcomes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Calibrations:</span>
                <span className="font-bold">{stats.outcomes.calibrations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Accuracy:</span>
                <span className="font-bold">{(stats.outcomes.average_accuracy * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Types Learned:</span>
                <span className="font-bold">{stats.outcomes.prediction_types_learned}</span>
              </div>
              <div className={`mt-2 p-2 rounded ${stats.outcomes.learning_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                <span className="text-sm font-semibold">
                  {stats.outcomes.learning_active ? '✓ Learning Active' : 'No Learning Yet'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Changes Inspector */}
      {learningChanges.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Learning Change Ledger</h2>
            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value);
                loadLearningChanges(e.target.value);
              }}
              className="px-3 py-1 border rounded"
            >
              <option value="all">All Domains</option>
              <option value="voice_extraction">Voice Extraction</option>
              <option value="alert_threshold">Alert Threshold</option>
              <option value="baseline_drift">Baseline Drift</option>
              <option value="prediction_calibration">Prediction Calibration</option>
            </select>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {learningChanges.map((change: any, idx: number) => (
              <div key={idx} className={`p-3 rounded border ${change.is_rolled_back ? 'bg-gray-100 border-gray-300' : 'bg-blue-50 border-blue-300'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm">{change.learning_domain}</span>
                    <span className="text-xs text-gray-600 ml-2">{change.change_type}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(change.applied_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs mt-1">{change.change_reason}</div>
                <div className="text-xs mt-1 text-gray-600">
                  Evidence: {change.evidence_count} | Confidence Δ: {change.confidence_delta?.toFixed(3)}
                </div>
                {change.is_rolled_back && (
                  <div className="text-xs mt-1 text-red-600 font-semibold">
                    ✗ Rolled back at {new Date(change.rolled_back_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
