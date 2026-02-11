import React, { useEffect, useState } from 'react';
import {
  verifyCapabilities,
  getCategoryDisplayName,
  getCategoryIcon,
  CapabilityReport,
} from '../../services/capabilityVerifier';

interface FeatureCompletionDashboardProps {
  agencyId: string;
}

export function FeatureCompletionDashboard({
  agencyId,
}: FeatureCompletionDashboardProps) {
  const [report, setReport] = useState<CapabilityReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [agencyId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const capabilityReport = await verifyCapabilities(agencyId);
      setReport(capabilityReport);
    } catch (error) {
      console.error('Error verifying capabilities:', error);
    }
    setLoading(false);
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCompletionLabel = (percentage: number) => {
    if (percentage >= 80) return 'Implemented';
    if (percentage >= 50) return 'Partial';
    if (percentage >= 20) return 'Stub';
    return 'NOT IMPLEMENTED';
  };

  const getImplementationStatus = (implemented: boolean) => {
    return implemented ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
        ✓ IMPLEMENTED
      </span>
    ) : (
      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
        ✗ NOT IMPLEMENTED
      </span>
    );
  };

  const renderCategoryCard = (
    categoryKey: string,
    categoryData: { percentage: number; capabilities: any[] }
  ) => {
    const title = getCategoryDisplayName(categoryKey);
    const icon = getCategoryIcon(categoryKey);
    const percentage = categoryData.percentage;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              <span className="text-sm text-gray-600">
                {getCompletionLabel(percentage)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {percentage.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">
              {categoryData.capabilities.filter((c) => c.implemented).length}/
              {categoryData.capabilities.length}
            </div>
          </div>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all duration-500 ${getCompletionColor(
              percentage
            )}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="space-y-3">
          {categoryData.capabilities.map((capability) => (
            <div
              key={capability.name}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 flex-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    capability.implemented ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm text-gray-700 flex-1">
                  {capability.name}
                </span>
              </div>
              {getImplementationStatus(capability.implemented)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12 text-gray-500">
          Verifying capabilities by attempting real execution...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12 text-gray-500">
          Unable to verify capabilities
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">
          Feature Completion Dashboard (LIVE VERIFICATION)
        </h2>
        <p className="text-blue-100 mb-6">
          Each capability is tested by attempting real execution. NOT IMPLEMENTED = Cannot
          execute.
        </p>
        <div className="flex items-center gap-8">
          <div>
            <div className="text-6xl font-bold">{report.overall}%</div>
            <div className="text-blue-100">Overall Completion</div>
          </div>
          <div className="flex-1">
            <div className="h-6 bg-blue-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${report.overall}%` }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-blue-100">
          Last verified: {new Date(report.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <h3 className="font-bold text-red-900 mb-1">
              Truth Enforcement Active
            </h3>
            <p className="text-sm text-red-800">
              This dashboard tests actual capability execution. If marked "NOT
              IMPLEMENTED", the capability cannot execute. No simulated completeness - only
              real execution counts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(report.categories).map(([categoryKey, categoryData]) =>
          renderCategoryCard(categoryKey, categoryData)
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
        <h3 className="font-bold text-gray-900 mb-4">Status Legend</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                ✓ IMPLEMENTED
              </div>
              <div className="text-xs text-gray-600">
                Capability can execute successfully
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                ✗ NOT IMPLEMENTED
              </div>
              <div className="text-xs text-gray-600">
                Capability cannot execute or fails
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-yellow-900 mb-2">
              How Verification Works
            </h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>
                • Each capability is tested by attempting to execute it against the
                database
              </li>
              <li>• If execution succeeds with expected results, it's IMPLEMENTED</li>
              <li>
                • If execution fails, returns no data, or throws error, it's NOT
                IMPLEMENTED
              </li>
              <li>
                • Percentages are calculated from actual pass/fail ratios, not
                configuration
              </li>
              <li>
                • This ensures the dashboard cannot show false progress - only real
                capabilities count
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
