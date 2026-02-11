import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface ComplianceStatus {
  compliance_score: number;
  total_certifications: number;
  expiring_certifications: number;
  audit_events_30_days: number;
  open_violations: number;
}

export const AgencyCompliancePage: React.FC = () => {
  const { isShowcaseMode, showcaseAgencyId } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);

  useEffect(() => {
    loadCompliance();
  }, [showcaseAgencyId, isShowcaseMode]);

  const loadCompliance = async () => {
    if (!showcaseAgencyId) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('get_agency_compliance_status', {
      p_agency_id: showcaseAgencyId,
      p_include_simulation: isShowcaseMode,
    });

    if (!error && data) {
      setCompliance(data);
    }
    setLoading(false);
  };

  if (loading || !compliance) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">Loading compliance status...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Compliance Dashboard</h1>
        <p className="text-gray-600">Monitor regulatory compliance and certifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Compliance Score</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{compliance.compliance_score}%</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Good standing</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Certifications</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{compliance.total_certifications}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Active certifications</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{compliance.expiring_certifications}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Within 30 days</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Audit Events (30d)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{compliance.audit_events_30_days.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Violations</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{compliance.open_violations}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">All clear</p>
        </div>
      </div>

      {isShowcaseMode && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Showcase Mode:</strong> In production, you can generate compliance reports, export audit logs, and track certification renewals.
          </p>
        </div>
      )}
    </div>
  );
};
