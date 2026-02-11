interface BrainOutput {
  type: 'CHANGE_DETECTION' | 'BASELINE_DEVIATION' | 'ACCUMULATED_DELAYS' | 'TIME_BOUND_AWARENESS' | 'CATEGORY_ACKNOWLEDGMENT' | 'ALL_CLEAR';
  observation: string;
  whyItMatters: string;
  currentRiskFraming: string;
  confidence: number;
  explicitBoundaries: string[];
  dataSource: string[];
  timeWindow: {
    start: string;
    end: string;
    description: string;
  };
  correlations?: Array<{
    type: string;
    details: string;
    severity: string;
  }>;
}

export function BrainOutputEvidenceStrip({ output }: { output: BrainOutput }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CHANGE_DETECTION': return 'bg-blue-50 border-blue-300';
      case 'BASELINE_DEVIATION': return 'bg-orange-50 border-orange-300';
      case 'ACCUMULATED_DELAYS': return 'bg-red-50 border-red-300';
      case 'TIME_BOUND_AWARENESS': return 'bg-yellow-50 border-yellow-300';
      case 'ALL_CLEAR': return 'bg-green-50 border-green-300';
      default: return 'bg-gray-50 border-gray-300';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getTypeColor(output.type)}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs font-bold text-gray-600 mb-1">BRAIN OUTPUT TYPE</div>
          <div className="text-lg font-bold">{output.type.replace(/_/g, ' ')}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-gray-600 mb-1">CONFIDENCE</div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getConfidenceColor(output.confidence)}`}
                style={{ width: `${output.confidence * 100}%` }}
              />
            </div>
            <span className="text-lg font-bold">{Math.round(output.confidence * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-bold text-gray-600 mb-1">OBSERVATION</div>
        <div className="text-sm font-semibold">{output.observation}</div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-bold text-gray-600 mb-1">WHY THIS MATTERS</div>
        <div className="text-sm">{output.whyItMatters}</div>
      </div>

      <div className="mb-3">
        <div className="text-xs font-bold text-gray-600 mb-1">CURRENT RISK FRAMING</div>
        <div className="text-sm">{output.currentRiskFraming}</div>
      </div>

      {output.explicitBoundaries && output.explicitBoundaries.length > 0 && (
        <div className="mb-3 bg-yellow-50 border border-yellow-300 rounded p-2">
          <div className="text-xs font-bold text-yellow-900 mb-1">⚠ WHAT SYSTEM CANNOT DETERMINE:</div>
          <ul className="list-disc list-inside space-y-1">
            {output.explicitBoundaries.map((boundary, idx) => (
              <li key={idx} className="text-xs text-yellow-800">{boundary}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded p-2 border border-gray-300">
          <div className="text-xs font-bold text-gray-600 mb-1">DATA SOURCES</div>
          <div className="flex flex-wrap gap-1">
            {output.dataSource.map((source, idx) => (
              <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {source}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded p-2 border border-gray-300">
          <div className="text-xs font-bold text-gray-600 mb-1">TIME WINDOW</div>
          <div className="text-xs text-gray-700">{output.timeWindow.description}</div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(output.timeWindow.start).toLocaleString()} → {new Date(output.timeWindow.end).toLocaleString()}
          </div>
        </div>
      </div>

      {output.correlations && output.correlations.length > 0 && (
        <div className="bg-purple-50 border border-purple-300 rounded p-2">
          <div className="text-xs font-bold text-purple-900 mb-2">CORRELATED OBSERVATIONS</div>
          <div className="space-y-2">
            {output.correlations.map((corr, idx) => (
              <div key={idx} className="bg-white rounded p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-purple-800">{corr.type}</span>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">{corr.severity}</span>
                </div>
                <div className="text-xs text-gray-700">{corr.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600">
        <span className="font-bold">Evidence Chain:</span> All data sealed and immutable. Audit trail complete.
      </div>
    </div>
  );
}
