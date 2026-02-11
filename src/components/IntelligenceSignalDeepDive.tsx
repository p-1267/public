import { useState } from 'react';

interface IntelligenceSignal {
  id: string;
  category: 'PROACTIVE' | 'REACTIVE' | 'PREDICTIVE';
  reasoning: {
    whatDetected: string;
    whyMatters: string;
    confidenceLevel: number;
    supportingEvidence: string[];
  };
  humanDecisionRequired: {
    decision: string;
    options: Array<{ option: string; consequence: string }>;
    consequences: string;
  };
  aiCannotAct: {
    reasons: string[];
    boundaries: string[];
  };
  suggestedActions: Array<{
    action: string;
    reasoning: string;
    requiresRole: string;
    requiresPermission: string;
  }>;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  residentName?: string;
  timestamp: string;
}

export function IntelligenceSignalDeepDive({ signals }: { signals: IntelligenceSignal[] }) {
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PROACTIVE': return 'bg-blue-50 border-blue-300 text-blue-900';
      case 'REACTIVE': return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'PREDICTIVE': return 'bg-purple-50 border-purple-300 text-purple-900';
      default: return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-600 text-white';
      case 'MEDIUM': return 'bg-yellow-600 text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  if (signals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-6xl mb-4">✓</div>
        <div className="text-xl font-semibold text-gray-700">All Clear</div>
        <div className="text-sm text-gray-600 mt-2">No intelligence signals detected</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Intelligence Signals ({signals.length})</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">PROACTIVE: Forward-looking</span>
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">REACTIVE: Response needed</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">PREDICTIVE: Pattern-based</span>
        </div>
      </div>

      {signals.map((signal) => {
        const isExpanded = expandedSignal === signal.id;
        return (
          <div
            key={signal.id}
            className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${getCategoryColor(signal.category)}`}
            onClick={() => setExpandedSignal(isExpanded ? null : signal.id)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityColor(signal.severity)}`}>
                  {signal.severity}
                </span>
                <span className="font-semibold text-lg">{signal.category}</span>
                {signal.residentName && (
                  <span className="text-sm text-gray-600">→ {signal.residentName}</span>
                )}
              </div>
              <span className="text-xs text-gray-600">{new Date(signal.timestamp).toLocaleString()}</span>
            </div>

            <div className="mb-3">
              <div className="font-bold text-sm mb-1">What System Detected:</div>
              <div className="text-sm">{signal.reasoning.whatDetected}</div>
            </div>

            <div className="mb-3">
              <div className="font-bold text-sm mb-1">Why This Matters:</div>
              <div className="text-sm">{signal.reasoning.whyMatters}</div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="font-bold text-sm">Confidence:</div>
              <div className="flex-1 bg-white rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${signal.reasoning.confidenceLevel * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold">{Math.round(signal.reasoning.confidenceLevel * 100)}%</span>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-300 space-y-4">
                <div className="bg-white rounded p-3">
                  <div className="font-bold text-sm mb-2 text-blue-900">Supporting Evidence:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {signal.reasoning.supportingEvidence.map((evidence, idx) => (
                      <li key={idx} className="text-sm text-gray-700">{evidence}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                  <div className="font-bold text-sm mb-2 text-yellow-900">⚠ Human Decision Required</div>
                  <div className="text-sm text-yellow-800 mb-2">
                    <span className="font-semibold">Decision:</span> {signal.humanDecisionRequired.decision}
                  </div>
                  <div className="space-y-2 mt-3">
                    {signal.humanDecisionRequired.options.map((opt, idx) => (
                      <div key={idx} className="bg-white rounded p-2 border border-yellow-200">
                        <div className="font-semibold text-sm text-yellow-900">Option {idx + 1}: {opt.option}</div>
                        <div className="text-xs text-yellow-700 mt-1">→ {opt.consequence}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-red-50 border border-red-300 rounded p-3">
                  <div className="font-bold text-sm mb-2 text-red-900">Why AI Cannot Act:</div>
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-red-700 mb-1">REASONS:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {signal.aiCannotAct.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-red-800">{reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-red-700 mb-1">BOUNDARIES:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {signal.aiCannotAct.boundaries.map((boundary, idx) => (
                        <li key={idx} className="text-sm text-red-800">{boundary}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-300 rounded p-3">
                  <div className="font-bold text-sm mb-2 text-green-900">Suggested Actions:</div>
                  <div className="space-y-3">
                    {signal.suggestedActions.map((action, idx) => (
                      <div key={idx} className="bg-white rounded p-3 border border-green-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-green-900">{action.action}</div>
                          <div className="flex gap-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {action.requiresRole}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                              {action.requiresPermission}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-semibold">Why:</span> {action.reasoning}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 text-xs text-center text-gray-600">
              {isExpanded ? '▲ Click to collapse' : '▼ Click for full reasoning and suggested actions'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
