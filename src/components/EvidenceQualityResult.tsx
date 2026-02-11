interface EvidenceQualityResultProps {
  quality: {
    score: number;
    completeness: number;
    clarity: number;
    timeliness: number;
    issues: string[];
    recommendations: string[];
  };
  onClose: () => void;
}

export function EvidenceQualityResult({ quality, onClose }: EvidenceQualityResultProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-300';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    return 'text-red-600 bg-red-50 border-red-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Acceptable';
    return 'Needs Improvement';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Evidence Quality Score</h2>

        <div className={`border-2 rounded-lg p-6 mb-6 ${getScoreColor(quality.score)}`}>
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">{quality.score}</div>
            <div className="text-xl font-semibold">{getScoreLabel(quality.score)}</div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="border border-gray-200 rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Completeness</span>
              <span className="text-lg font-bold">{quality.completeness}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${quality.completeness}%` }}
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Clarity</span>
              <span className="text-lg font-bold">{quality.clarity}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${quality.clarity}%` }}
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Timeliness</span>
              <span className="text-lg font-bold">{quality.timeliness}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${quality.timeliness}%` }}
              />
            </div>
          </div>
        </div>

        {quality.issues.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <div className="text-sm font-bold text-yellow-900 mb-2">Issues Detected:</div>
            <ul className="text-sm text-yellow-800 space-y-1">
              {quality.issues.map((issue, idx) => (
                <li key={idx}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {quality.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <div className="text-sm font-bold text-blue-900 mb-2">Recommendations:</div>
            <ul className="text-sm text-blue-800 space-y-1">
              {quality.recommendations.map((rec, idx) => (
                <li key={idx}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
