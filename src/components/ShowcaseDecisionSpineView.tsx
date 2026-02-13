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
      <div className="bg-slate-900 text-white rounded-lg p-6 border-l-4 border-slate-700">
        <div className="text-xl font-bold mb-2">Cognitive Authority: Active</div>
        <div className="text-sm text-slate-300 mb-4">System is judging all operational contexts in real-time</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 text-center border-l-2 border-red-500">
            <div className="text-3xl font-bold text-red-400">{critical.length}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Critical</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border-l-2 border-orange-500">
            <div className="text-3xl font-bold text-orange-400">{unsafe.length}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Unsafe</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border-l-2 border-amber-500">
            <div className="text-3xl font-bold text-amber-400">{concerning.length}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Concerning</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center border-l-2 border-green-500">
            <div className="text-3xl font-bold text-green-400">{acceptable.length}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Acceptable</div>
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
