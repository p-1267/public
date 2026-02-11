/**
 * WP5: AI-Generated Reports Showcase
 *
 * Demonstrates:
 * - Auto-generated reports from real data (NO templates)
 * - 4 report types: Shift, Daily Summary, Incident, Family Update
 * - Reports change when underlying data changes
 * - Evidence links are verifiable
 * - Supervisor edits are logged (AI vs human distinguishable)
 *
 * Acceptance Criteria:
 * - Reports auto-generated without manual writing
 * - Reports change when data changes
 * - Evidence links clickable and correct
 * - Edit tracking functional
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Report {
  id: string;
  report_type: string;
  report_title: string;
  report_content: any;
  report_date: string;
  generated_at: string;
  is_published: boolean;
  is_superseded: boolean;
  has_edits: boolean;
  evidence_links_count: number;
}

export function WP5AIReportsShowcase({ agencyId }: { agencyId: string }) {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    loadReports();
  }, [agencyId]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase.rpc('list_reports', {
        p_agency_id: agencyId,
        p_limit: 50,
      });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      console.error('Error loading reports:', error);
    }
  };

  const seedScenario = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('seed_wp5_acceptance_scenario', {
        p_agency_id: agencyId,
      });

      if (error) throw error;
      alert(`Scenario seeded:\n${JSON.stringify(data, null, 2)}`);
      await loadReports();
    } catch (error: any) {
      alert(`Error seeding scenario: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runVerification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_wp5_ai_reports', {
        p_agency_id: agencyId,
      });

      if (error) throw error;
      setVerificationResult(data);
      alert(`Verification complete:\n${JSON.stringify(data, null, 2)}`);
      await loadReports();
    } catch (error: any) {
      alert(`Error running verification: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateShiftReport = async (shiftId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_shift_report', {
        p_agency_id: agencyId,
        p_shift_id: shiftId,
      });

      if (error) throw error;
      alert(`Shift report generated:\n${JSON.stringify(data, null, 2)}`);
      await loadReports();
    } catch (error: any) {
      alert(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateDailySummary = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_daily_summary', {
        p_agency_id: agencyId,
        p_report_date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      alert(`Daily summary generated:\n${JSON.stringify(data, null, 2)}`);
      await loadReports();
    } catch (error: any) {
      alert(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const viewReport = async (reportId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_report_with_edits', {
        p_report_id: reportId,
      });

      if (error) throw error;
      setSelectedReport(data);
    } catch (error: any) {
      alert(`Error viewing report: ${error.message}`);
    }
  };

  const regenerateReport = async (reportId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('regenerate_report', {
        p_report_id: reportId,
      });

      if (error) throw error;
      alert(`Regeneration result:\n${JSON.stringify(data, null, 2)}`);
      await loadReports();
    } catch (error: any) {
      alert(`Error regenerating: ${error.message}`);
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
          WP5: AI-Generated Reports (Derived Intelligence) - TRUTH ENFORCED
        </h1>
        <p className="text-gray-600">
          Reports are computed from real data - NO templates, NO manual writing
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-blue-50 rounded-lg shadow-sm border-2 border-blue-500 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Report Controls</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={seedScenario}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Seeding...' : '1. Seed Scenario'}
          </button>
          <button
            onClick={generateDailySummary}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Generating...' : '2. Generate Daily Summary'}
          </button>
          <button
            onClick={runVerification}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            {loading ? 'Verifying...' : '3. Run Verification'}
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
                WP5 Acceptance: {acceptance.passed ? 'PASS' : 'FAIL'}
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

      {/* Generated Reports List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Generated Reports</h2>
        <div className="space-y-2">
          {reports.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No reports generated yet. Click "Generate Daily Summary" to start.
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="p-4 border rounded hover:bg-gray-50 cursor-pointer"
                onClick={() => viewReport(report.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{report.report_title}</div>
                    <div className="text-sm text-gray-600">
                      {report.report_type} | {new Date(report.report_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Generated: {new Date(report.generated_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.has_edits && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                        Edited
                      </span>
                    )}
                    {report.is_published && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Published
                      </span>
                    )}
                    {report.is_superseded && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        Superseded
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        regenerateReport(report.id);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Report Viewer */}
      {selectedReport && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Report Viewer</h2>
            <button
              onClick={() => setSelectedReport(null)}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-2">{selectedReport.report_title}</h3>
              <div className="text-sm text-gray-600 mb-4">
                Type: {selectedReport.report_type} | Generated: {new Date(selectedReport.generated_at).toLocaleString()}
              </div>
            </div>

            {/* Report Content */}
            <div className="space-y-4">
              {selectedReport.report_content?.sections?.map((section: any, idx: number) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-bold text-gray-900 mb-2">{section.heading}</h4>
                  <div className="text-gray-700 whitespace-pre-wrap">{section.content}</div>
                  {section.data && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer">View Data</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                        {JSON.stringify(section.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {/* Evidence Links */}
            {selectedReport.evidence_links && Object.keys(selectedReport.evidence_links).length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-bold mb-2">Evidence Links</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedReport.evidence_links).map(([key, value]: [string, any]) => (
                    value && Array.isArray(value) && value.length > 0 && (
                      <div key={key} className="p-2 bg-blue-50 rounded">
                        <div className="text-sm font-semibold">{key}</div>
                        <div className="text-xs text-gray-600">{value.length} linked items</div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Edit History */}
            {selectedReport.has_edits && selectedReport.edits && (
              <div className="border-t pt-4">
                <h4 className="font-bold mb-2">Edit History ({selectedReport.edit_count})</h4>
                <div className="space-y-2">
                  {selectedReport.edits.map((edit: any, idx: number) => (
                    <div key={idx} className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
                      <div className="text-sm">
                        <span className="font-semibold">Section:</span> {edit.section_edited}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Edited: {new Date(edit.edit_timestamp).toLocaleString()}
                      </div>
                      {edit.edit_reason && (
                        <div className="text-xs text-gray-700 mt-1">
                          <span className="font-semibold">Reason:</span> {edit.edit_reason}
                        </div>
                      )}
                      <div className="flex gap-2 mt-1">
                        {edit.is_correction && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            Correction
                          </span>
                        )}
                        {edit.is_redaction && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                            Redaction
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Data Hash */}
            <div className="border-t pt-4">
              <h4 className="font-bold mb-2">Truth Enforcement</h4>
              <div className="text-xs font-mono bg-gray-100 p-2 rounded">
                <div><span className="font-semibold">Source Data Hash:</span> {selectedReport.source_data_hash}</div>
                <div className="mt-1"><span className="font-semibold">Generation Method:</span> {selectedReport.generation_method}</div>
                <div className="mt-1"><span className="font-semibold">Template Version:</span> {selectedReport.template_version}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
