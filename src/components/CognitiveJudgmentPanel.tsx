interface CognitiveJudgment {
  scenario_id: string;
  what_is_happening: string;
  what_is_wrong: string;
  what_is_at_risk: string[];
  who_is_affected: string[];
  what_should_happen_next: string;
  what_must_not_be_done: string[];
  what_is_still_missing: string[];
  what_is_blocked: string[];
  judgment: string;
  system_cannot_determine: string[];
  severity: 'CRITICAL' | 'UNSAFE' | 'CONCERNING' | 'ACCEPTABLE';
}

export function CognitiveJudgmentPanel({ judgments }: { judgments: CognitiveJudgment[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-900 text-white border-red-900';
      case 'UNSAFE': return 'bg-red-600 text-white border-red-600';
      case 'CONCERNING': return 'bg-yellow-600 text-white border-yellow-600';
      case 'ACCEPTABLE': return 'bg-green-600 text-white border-green-600';
      default: return 'bg-gray-600 text-white border-gray-600';
    }
  };

  if (judgments.length === 0) {
    return (
      <div className="bg-green-50 border-2 border-green-600 rounded-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">✓</div>
          <div className="text-2xl font-bold text-green-900 mb-2">SYSTEM JUDGMENT: ACCEPTABLE</div>
          <div className="text-lg text-green-800">All current operations are within safe parameters.</div>
          <div className="text-sm text-green-700 mt-3">
            No active risks detected. No role violations. No unacceptable conditions.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">COGNITIVE AUTHORITY: ACTIVE JUDGMENTS</h2>
          <div className="text-sm text-gray-600 mt-1">System analysis of current operational state</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-red-600">{judgments.length}</div>
          <div className="text-xs text-gray-600">SITUATIONS REQUIRING JUDGMENT</div>
        </div>
      </div>

      {judgments.map((judgment, idx) => (
        <div
          key={idx}
          className="border-4 rounded-lg overflow-hidden"
          style={{ borderColor: judgment.severity === 'CRITICAL' ? '#991b1b' : judgment.severity === 'UNSAFE' ? '#dc2626' : '#ca8a04' }}
        >
          <div className={`p-4 ${getSeverityColor(judgment.severity)}`}>
            <div className="text-2xl font-bold mb-2">
              {judgment.severity === 'CRITICAL' && '🚨 CRITICAL: '}
              {judgment.severity === 'UNSAFE' && '⚠️ UNSAFE: '}
              {judgment.severity === 'CONCERNING' && '⚠ CONCERNING: '}
              SYSTEM JUDGMENT
            </div>
            <div className="text-xl font-semibold">{judgment.judgment}</div>
          </div>

          <div className="p-6 bg-white space-y-4">
            <div className="border-l-4 border-blue-600 pl-4">
              <div className="text-xs font-bold text-blue-600 mb-1">WHAT IS HAPPENING RIGHT NOW</div>
              <div className="text-base font-semibold text-gray-900">{judgment.what_is_happening}</div>
            </div>

            <div className="border-l-4 border-red-600 pl-4">
              <div className="text-xs font-bold text-red-600 mb-1">WHAT IS WRONG</div>
              <div className="text-base font-semibold text-red-900">{judgment.what_is_wrong}</div>
            </div>

            <div className="border-l-4 border-orange-600 pl-4">
              <div className="text-xs font-bold text-orange-600 mb-2">WHAT IS AT RISK</div>
              <ul className="space-y-1">
                {judgment.what_is_at_risk.map((risk, ridx) => (
                  <li key={ridx} className="text-sm text-orange-900 font-semibold">
                    • {risk.replace('RISK: ', '')}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-l-4 border-purple-600 pl-4">
              <div className="text-xs font-bold text-purple-600 mb-2">WHO IS AFFECTED</div>
              <div className="flex flex-wrap gap-2">
                {judgment.who_is_affected.map((actor, aidx) => (
                  <span key={aidx} className="px-3 py-1 bg-purple-100 text-purple-900 rounded-full text-sm font-semibold">
                    {actor}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
              <div className="text-sm font-bold text-green-900 mb-2">✓ WHAT SHOULD HAPPEN NEXT</div>
              <div className="text-base font-semibold text-green-800">{judgment.what_should_happen_next}</div>
            </div>

            {judgment.what_must_not_be_done.length > 0 && (
              <div className="bg-red-50 border-2 border-red-600 rounded-lg p-4">
                <div className="text-sm font-bold text-red-900 mb-2">✗ WHAT MUST NOT BE DONE</div>
                <ul className="space-y-1">
                  {judgment.what_must_not_be_done.map((prohibition, pidx) => (
                    <li key={pidx} className="text-sm text-red-800 font-semibold">
                      • {prohibition}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {judgment.what_is_blocked.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-600 rounded-lg p-4">
                <div className="text-sm font-bold text-yellow-900 mb-2">🔒 WHAT IS BLOCKED</div>
                <ul className="space-y-1">
                  {judgment.what_is_blocked.map((blockage, bidx) => (
                    <li key={bidx} className="text-sm text-yellow-800 font-semibold">
                      • {blockage}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {judgment.what_is_still_missing.length > 0 && (
              <div className="bg-gray-50 border border-gray-400 rounded-lg p-4">
                <div className="text-sm font-bold text-gray-700 mb-2">⚪ WHAT IS STILL MISSING</div>
                <ul className="space-y-1">
                  {judgment.what_is_still_missing.map((missing, midx) => (
                    <li key={midx} className="text-sm text-gray-700">
                      • {missing}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {judgment.system_cannot_determine.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-4">
                <div className="text-sm font-bold text-blue-900 mb-2">🧠 WHAT SYSTEM CANNOT DETERMINE</div>
                <ul className="space-y-1">
                  {judgment.system_cannot_determine.map((limitation, lidx) => (
                    <li key={lidx} className="text-sm text-blue-800 font-semibold">
                      • {limitation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
