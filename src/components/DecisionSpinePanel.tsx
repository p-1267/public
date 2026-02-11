import { DecisionSpineOutput } from '../services/decisionSpine';

export function DecisionSpinePanel({ decision }: { decision: DecisionSpineOutput }) {
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'CRITICAL': return 'bg-red-900 text-white border-red-900';
      case 'UNSAFE': return 'bg-red-600 text-white border-red-600';
      case 'CONCERNING': return 'bg-yellow-600 text-white border-yellow-600';
      case 'ACCEPTABLE': return 'bg-green-600 text-white border-green-600';
      default: return 'bg-gray-600 text-white border-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'WORSENING': return '📉';
      case 'STABLE': return '➡️';
      case 'IMPROVING': return '📈';
      default: return '—';
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
    return `${Math.floor(seconds / 86400)} days`;
  };

  return (
    <div className="border-4 rounded-lg overflow-hidden" style={{
      borderColor: decision.question_2_what_is_wrong_or_at_risk.classification === 'CRITICAL' ? '#991b1b' :
                   decision.question_2_what_is_wrong_or_at_risk.classification === 'UNSAFE' ? '#dc2626' :
                   decision.question_2_what_is_wrong_or_at_risk.classification === 'CONCERNING' ? '#ca8a04' : '#16a34a'
    }}>
      <div className={`p-4 ${getClassificationColor(decision.question_2_what_is_wrong_or_at_risk.classification)}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="text-2xl font-bold mb-1">
              {decision.question_2_what_is_wrong_or_at_risk.classification === 'CRITICAL' && '🚨 CRITICAL'}
              {decision.question_2_what_is_wrong_or_at_risk.classification === 'UNSAFE' && '⚠️ UNSAFE'}
              {decision.question_2_what_is_wrong_or_at_risk.classification === 'CONCERNING' && '⚠ CONCERNING'}
              {decision.question_2_what_is_wrong_or_at_risk.classification === 'ACCEPTABLE' && '✓ ACCEPTABLE'}
            </div>
            <div className="text-sm opacity-90">Context: {decision.context_type} {decision.context_id}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl mb-1">{getTrendIcon(decision.time_awareness.situation_trend)}</div>
            <div className="text-xs opacity-90">{decision.time_awareness.situation_trend}</div>
            <div className="text-xs opacity-75">{decision.time_awareness.days_in_current_state} days in state</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 space-y-5">
        <div className="border-l-4 border-blue-600 pl-4">
          <div className="text-xs font-bold text-blue-600 mb-1">1. WHAT IS HAPPENING RIGHT NOW</div>
          <div className="text-sm text-gray-900 font-semibold">{decision.question_1_what_is_happening}</div>
        </div>

        {decision.question_2_what_is_wrong_or_at_risk.specific_risks.length > 0 && (
          <div className="border-l-4 border-red-600 pl-4">
            <div className="text-xs font-bold text-red-600 mb-2">2. WHAT IS WRONG OR AT RISK</div>
            <ul className="space-y-1">
              {decision.question_2_what_is_wrong_or_at_risk.specific_risks.map((risk, idx) => (
                <li key={idx} className="text-sm text-red-900">• {risk}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-l-4 border-gray-600 pl-4">
          <div className="text-xs font-bold text-gray-600 mb-2">3. WHY CLASSIFIED THIS WAY</div>

          {decision.question_3_why_classified_this_way.rules_fired.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">Rules Fired:</div>
              <ul className="space-y-1">
                {decision.question_3_why_classified_this_way.rules_fired.map((rule, idx) => (
                  <li key={idx} className="text-xs text-gray-900">• {rule}</li>
                ))}
              </ul>
            </div>
          )}

          {decision.question_3_why_classified_this_way.thresholds_crossed.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">Thresholds Crossed:</div>
              <ul className="space-y-1">
                {decision.question_3_why_classified_this_way.thresholds_crossed.map((threshold, idx) => (
                  <li key={idx} className="text-xs text-gray-900">• {threshold}</li>
                ))}
              </ul>
            </div>
          )}

          {decision.question_3_why_classified_this_way.trends_detected.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">Trends Detected:</div>
              <ul className="space-y-1">
                {decision.question_3_why_classified_this_way.trends_detected.map((trend, idx) => (
                  <li key={idx} className="text-xs text-gray-900">• {trend}</li>
                ))}
              </ul>
            </div>
          )}

          {decision.question_3_why_classified_this_way.baselines_compared.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Baselines Compared:</div>
              <ul className="space-y-1">
                {decision.question_3_why_classified_this_way.baselines_compared.map((baseline, idx) => (
                  <li key={idx} className="text-xs text-gray-900">• {baseline}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border-2 border-blue-600 rounded-lg p-4">
          <div className="text-sm font-bold text-blue-900 mb-1">4. SINGLE MOST IMPORTANT DECISION</div>
          <div className="text-lg text-blue-800 font-bold">{decision.question_4_single_most_important_decision}</div>
        </div>

        {decision.question_5_what_must_happen_next.ordered_actions.length > 0 && (
          <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
            <div className="text-sm font-bold text-green-900 mb-3">5. WHAT MUST HAPPEN NEXT (IN ORDER)</div>
            <div className="space-y-2">
              {decision.question_5_what_must_happen_next.ordered_actions.map((action) => (
                <div key={action.sequence} className="flex items-start gap-3 bg-white rounded p-2">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {action.sequence}
                  </div>
                  <div className="flex-grow">
                    <div className="text-sm font-semibold text-green-900">{action.action}</div>
                    <div className="text-xs text-green-700 mt-1">
                      Deadline: {new Date(action.deadline).toLocaleString()}
                      <span className="ml-2 font-bold">({formatTimeRemaining(action.time_remaining_seconds)} remaining)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {decision.question_6_what_must_not_happen.length > 0 && (
          <div className="bg-red-50 border-2 border-red-600 rounded-lg p-4">
            <div className="text-sm font-bold text-red-900 mb-2">6. WHAT MUST NOT HAPPEN (PROHIBITED)</div>
            <ul className="space-y-1">
              {decision.question_6_what_must_not_happen.map((prohibition, idx) => (
                <li key={idx} className="text-sm text-red-800 font-semibold">✗ {prohibition}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-l-4 border-blue-600 pl-4">
          <div className="text-xs font-bold text-blue-600 mb-2">7. WHO IS ACCOUNTABLE FOR NEXT ACTION</div>
          <div className="text-sm text-blue-900 font-semibold">
            {decision.question_7_who_is_accountable.role.replace(/_/g, ' ')}
            {decision.question_7_who_is_accountable.person_name && (
              <span className="ml-2">— {decision.question_7_who_is_accountable.person_name}</span>
            )}
          </div>
        </div>

        {decision.question_8_what_happens_if_nothing_changes.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-600 rounded-lg p-4">
            <div className="text-sm font-bold text-orange-900 mb-2">8. WHAT HAPPENS IF NOTHING CHANGES (CONSEQUENCES)</div>
            <ul className="space-y-1">
              {decision.question_8_what_happens_if_nothing_changes.map((consequence, idx) => (
                <li key={idx} className="text-sm text-orange-800 font-semibold">⚠ {consequence}</li>
              ))}
            </ul>
          </div>
        )}

        {decision.question_9_what_system_does_not_know.length > 0 && (
          <div className="bg-gray-50 border-2 border-gray-600 rounded-lg p-4">
            <div className="text-sm font-bold text-gray-900 mb-2">9. WHAT SYSTEM DOES NOT KNOW (REQUIRES HUMAN JUDGMENT)</div>
            <ul className="space-y-1">
              {decision.question_9_what_system_does_not_know.map((unknown, idx) => (
                <li key={idx} className="text-sm text-gray-700 font-semibold">? {unknown}</li>
              ))}
            </ul>
          </div>
        )}

        {decision.question_10_what_decisions_blocked.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-600 rounded-lg p-4">
            <div className="text-sm font-bold text-yellow-900 mb-3">10. WHAT DECISIONS ARE BLOCKED (PENDING HUMAN)</div>
            {decision.question_10_what_decisions_blocked.map((blocked, idx) => (
              <div key={idx} className="mb-2 last:mb-0 bg-white rounded p-2">
                <div className="text-sm font-semibold text-yellow-900">{blocked.decision}</div>
                <div className="text-xs text-yellow-700 mt-1">
                  Requires: {blocked.requires_human_role} • Reason: {blocked.reason_blocked}
                </div>
              </div>
            ))}
          </div>
        )}

        {decision.role_enforcement.violations.length > 0 && (
          <div className="bg-red-100 border-2 border-red-700 rounded-lg p-4">
            <div className="text-sm font-bold text-red-900 mb-3">ROLE ENFORCEMENT VIOLATIONS</div>
            {decision.role_enforcement.violations.map((violation, idx) => (
              <div key={idx} className="mb-3 last:mb-0 bg-white rounded p-3 border-2 border-red-600">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm font-bold text-red-900">{violation.severity}</div>
                  <div className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">{violation.type}</div>
                </div>
                <div className="text-sm text-red-800 mb-1">{violation.description}</div>
                <div className="text-xs text-red-700">Person: {violation.person_involved}</div>
                <div className="text-xs text-red-700 font-semibold mt-2">Required: {violation.required_correction}</div>
              </div>
            ))}
          </div>
        )}

        {decision.time_awareness.countdown_to_escalation_seconds && (
          <div className="bg-red-100 border-2 border-red-700 rounded p-3">
            <div className="text-xs font-bold text-red-900 mb-1">⏱ TIME TO ESCALATION</div>
            <div className="text-lg font-bold text-red-800">
              {formatTimeRemaining(decision.time_awareness.countdown_to_escalation_seconds)}
            </div>
          </div>
        )}

        {decision.time_awareness.next_risk_to_materialize && (
          <div className="border-l-4 border-orange-600 pl-4">
            <div className="text-xs font-bold text-orange-600 mb-1">NEXT RISK TO MATERIALIZE</div>
            <div className="text-sm text-orange-900 font-semibold">{decision.time_awareness.next_risk_to_materialize}</div>
          </div>
        )}
      </div>
    </div>
  );
}
