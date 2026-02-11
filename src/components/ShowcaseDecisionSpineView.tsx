import { DecisionSpine } from '../services/decisionSpine';
import { DecisionSpinePanel } from './DecisionSpinePanel';
import { Level4ShowcasePanel } from './Level4ShowcasePanel';
import { SystemJudgmentBanner } from './SystemJudgmentBanner';

export function ShowcaseDecisionSpineView() {
  const scenarios = DecisionSpine.generateRichSyntheticScenarios();
  const decisions = scenarios.map(s => DecisionSpine.evaluateContext('RESIDENT', s.resident.id, s));

  const critical = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'CRITICAL');
  const unsafe = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'UNSAFE');
  const concerning = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'CONCERNING');
  const acceptable = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'ACCEPTABLE');

  return (
    <div className="p-6 space-y-6">
      <div className="bg-black text-white rounded-lg p-6 border-4 border-yellow-500">
        <div className="text-3xl font-bold mb-2">🧠 COGNITIVE AUTHORITY: ACTIVE</div>
        <div className="text-xl mb-4">System is judging all operational contexts in real-time</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-red-900 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold">{critical.length}</div>
            <div className="text-sm">CRITICAL</div>
          </div>
          <div className="bg-red-600 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold">{unsafe.length}</div>
            <div className="text-sm">UNSAFE</div>
          </div>
          <div className="bg-yellow-600 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold">{concerning.length}</div>
            <div className="text-sm">CONCERNING</div>
          </div>
          <div className="bg-green-600 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold">{acceptable.length}</div>
            <div className="text-sm">ACCEPTABLE</div>
          </div>
        </div>
      </div>

      <Level4ShowcasePanel />

      {critical.length > 0 && (
        <div className="space-y-4">
          <SystemJudgmentBanner
            classification="CRITICAL"
            count={critical.length}
            description="System has identified imminent danger situations requiring immediate intervention."
          />
          {critical.slice(0, 3).map((decision, idx) => (
            <DecisionSpinePanel key={idx} decision={decision} />
          ))}
        </div>
      )}

      {unsafe.length > 0 && (
        <div className="space-y-4">
          <SystemJudgmentBanner
            classification="UNSAFE"
            count={unsafe.length}
            description="System has detected safety boundary violations that must be corrected immediately."
          />
          {unsafe.slice(0, 3).map((decision, idx) => (
            <DecisionSpinePanel key={idx} decision={decision} />
          ))}
        </div>
      )}

      {concerning.length > 0 && (
        <div className="space-y-4">
          <SystemJudgmentBanner
            classification="CONCERNING"
            count={concerning.length}
            description="System has identified patterns requiring attention before escalation."
          />
          {concerning.slice(0, 5).map((decision, idx) => (
            <DecisionSpinePanel key={idx} decision={decision} />
          ))}
        </div>
      )}
    </div>
  );
}
