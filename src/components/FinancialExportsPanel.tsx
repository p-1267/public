import { useState, useEffect } from 'react';
import { useFinancialExports } from '../hooks/useFinancialExports';
import { useShowcase } from '../contexts/ShowcaseContext';
import { SHOWCASE_MODE } from '../config/showcase';
import { BrainBlockModal } from './BrainBlockModal';

interface Props {
  exportType: 'PAYROLL' | 'BILLING';
}

export function FinancialExportsPanel({ exportType }: Props) {
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [blockingRule, setBlockingRule] = useState<any | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('JSON');
  const [jurisdiction, setJurisdiction] = useState('US');

  const { mockAgencyId } = useShowcase();
  const {
    payrollExports,
    billingExports,
    generatePayrollExport,
    generateBillingExport,
    sealExport,
    downloadExport
  } = useFinancialExports(mockAgencyId);

  useEffect(() => {
    if (mockAgencyId) {
      setExports(exportType === 'PAYROLL' ? payrollExports : billingExports);
      setLoading(false);
    }
  }, [exportType, payrollExports, billingExports, mockAgencyId]);

  const handleCalculatePreview = async () => {
    if (SHOWCASE_MODE) {
      setBlockingRule({
        section: 'Phase 3 — Financial Exports',
        rule: 'Export generation requires production mode',
        risk: 'In Showcase Mode, all write operations are blocked',
        remediation: 'Switch to production mode to generate exports'
      });
      return;
    }

    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select start and end dates' });
      return;
    }

    setMessage({ type: 'success', text: 'Preview calculated (demo)' });
  };

  const handleGenerateExport = async () => {
    if (SHOWCASE_MODE) {
      setBlockingRule({
        section: 'Phase 3 — Financial Exports',
        rule: 'Export generation requires production mode',
        risk: 'In Showcase Mode, all write operations are blocked',
        remediation: 'Switch to production mode to generate exports'
      });
      return;
    }

    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select start and end dates' });
      return;
    }

    try {
      setGenerating(true);
      setMessage(null);

      if (exportType === 'PAYROLL') {
        await generatePayrollExport({ startDate, endDate, format: format as 'CSV' | 'JSON', jurisdiction });
      } else {
        await generateBillingExport({ startDate, endDate, format: format as 'CSV' | 'JSON' });
      }

      setMessage({ type: 'success', text: 'Export generated successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to generate export' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSealExport = async (exportId: string) => {
    if (SHOWCASE_MODE) {
      setBlockingRule({
        section: 'Phase 3 — Financial Exports',
        rule: 'Sealing exports requires production mode',
        risk: 'Sealed exports are immutable and cannot be undone',
        remediation: 'Switch to production mode to seal exports'
      });
      return;
    }

    if (!confirm('Seal this export? This will make it immutable and cannot be undone.')) {
      return;
    }

    try {
      setMessage(null);
      await sealExport(exportType, exportId);
      setMessage({ type: 'success', text: 'Export sealed successfully - now immutable' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to seal export' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading exports...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">{exportType === 'PAYROLL' ? 'Payroll' : 'Billing'} Exports</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Generate New Export</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="JSON">JSON</option>
              <option value="CSV">CSV</option>
            </select>
          </div>
          {exportType === 'PAYROLL' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
              <input
                type="text"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="US"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCalculatePreview}
            className="px-4 py-2 bg-gray-600 text-white rounded font-semibold hover:bg-gray-700"
          >
            Calculate Preview
          </button>
          <button
            onClick={handleGenerateExport}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Export'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Export History</h3>

        {exports.length === 0 ? (
          <div className="text-gray-600 text-center py-8">No exports found</div>
        ) : (
          <div className="space-y-3">
            {exports.map((exp) => (
              <div
                key={exp.id}
                className={`border rounded p-4 ${
                  exp.is_sealed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">
                      Version {exp.export_version} - {exp.format}
                      {exp.is_sealed && <span className="ml-2 text-green-600">SEALED</span>}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Period: {new Date(exp.start_date).toLocaleDateString()} - {new Date(exp.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Records: {exp.record_count} |
                      {exportType === 'PAYROLL'
                        ? ` Hours: ${exp.total_hours?.toFixed(2)} | Amount: $${exp.total_amount?.toFixed(2)}`
                        : ` Units: ${exp.total_units?.toFixed(2)} | Amount: $${exp.total_amount?.toFixed(2)}`
                      }
                    </div>
                    <div className="text-sm text-gray-600">
                      Generated: {new Date(exp.generated_at).toLocaleString()}
                    </div>
                  </div>
                  {!exp.is_sealed && (
                    <button
                      onClick={() => handleSealExport(exp.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded font-semibold hover:bg-green-700"
                    >
                      Seal Export
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mt-6">
        <p className="text-sm text-yellow-800 font-semibold">Finance is derived evidence:</p>
        <p className="text-sm text-yellow-800 mt-1">
          All exports are calculated from sealed attendance records. Sealed exports are immutable and eligible for payroll processing and insurance billing.
        </p>
      </div>

      {blockingRule && (
        <BrainBlockModal
          rule={blockingRule}
          mode={SHOWCASE_MODE ? 'showcase' : 'production'}
          onClose={() => setBlockingRule(null)}
        />
      )}
    </div>
  );
}
