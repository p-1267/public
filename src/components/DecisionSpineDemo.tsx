import { useEffect, useState } from 'react';
import { DecisionSpine, DecisionSpineOutput } from '../services/decisionSpine';
import { DecisionSpinePanel } from './DecisionSpinePanel';
import { Level4ShowcasePanel } from './Level4ShowcasePanel';
import { SystemJudgmentBanner } from './SystemJudgmentBanner';

export function DecisionSpineDemo() {
  const [decisions, setDecisions] = useState<DecisionSpineOutput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDecisions();
  }, []);

  const loadDecisions = () => {
    setLoading(true);

    const scenarios = DecisionSpine.generateRichSyntheticScenarios();
    const computedDecisions = scenarios.map(scenario =>
      DecisionSpine.evaluateContext('RESIDENT', scenario.resident.id, scenario)
    );

    setDecisions(computedDecisions);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-2xl font-bold mb-4">Decision Spine Initializing...</div>
        <div className="text-gray-600">Evaluating all resident contexts through unified decision framework</div>
      </div>
    );
  }

  const critical = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'CRITICAL');
  const unsafe = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'UNSAFE');
  const concerning = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'CONCERNING');
  const acceptable = decisions.filter(d => d.question_2_what_is_wrong_or_at_risk.classification === 'ACCEPTABLE');

  return (
    <div className="space-y-6 p-6">
      <Level4ShowcasePanel />

      <div className="bg-blue-50 border-4 border-blue-600 rounded-lg p-6">
        <div className="text-3xl font-bold text-blue-900 mb-4">DECISION SPINE: UNIFIED INTELLIGENCE BACKBONE</div>

        <div className="text-base text-blue-800 mb-6">
          The Decision Spine is a deterministic decision engine that continuously evaluates all operational contexts
          and produces explicit judgments using a consistent 10-question framework. This is the governing logic
          that makes every decision visible, accountable, and bounded.
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-2 border-red-900">
            <div className="text-4xl font-bold text-red-900 mb-1">{critical.length}</div>
            <div className="text-sm font-bold text-red-800">CRITICAL</div>
            <div className="text-xs text-red-700">Requires immediate intervention</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-red-600">
            <div className="text-4xl font-bold text-red-600 mb-1">{unsafe.length}</div>
            <div className="text-sm font-bold text-red-700">UNSAFE</div>
            <div className="text-xs text-red-600">Requires urgent correction</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-yellow-600">
            <div className="text-4xl font-bold text-yellow-600 mb-1">{concerning.length}</div>
            <div className="text-sm font-bold text-yellow-700">CONCERNING</div>
            <div className="text-xs text-yellow-600">Requires attention</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-2 border-green-600">
            <div className="text-4xl font-bold text-green-600 mb-1">{acceptable.length}</div>
            <div className="text-sm font-bold text-green-700">ACCEPTABLE</div>
            <div className="text-xs text-green-600">Within parameters</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4">
          <div className="text-sm font-bold text-blue-900 mb-3">DECISION SPINE GUARANTEES</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-bold text-blue-800 mb-2">Every Decision Includes:</div>
              <ul className="space-y-1 text-blue-700">
                <li>• Explicit classification (CRITICAL/UNSAFE/CONCERNING/ACCEPTABLE)</li>
                <li>• Reasoning (rules fired, thresholds crossed, trends detected)</li>
                <li>• Consequences (what happens if nothing changes)</li>
                <li>• Accountability (who is responsible for next action)</li>
                <li>• Time boundaries (deadlines and countdowns)</li>
                <li>• Prohibitions (what must NOT happen)</li>
                <li>• System limitations (what it cannot determine)</li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-blue-800 mb-2">System Never:</div>
              <ul className="space-y-1 text-blue-700">
                <li>• Executes actions autonomously</li>
                <li>• Hides uncertainty</li>
                <li>• Simplifies judgments into colors/badges</li>
                <li>• Replaces reasoning with summaries</li>
                <li>• Makes decisions without stating consequences</li>
                <li>• Proceeds without human confirmation</li>
                <li>• Remains silent when classification changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border-2 border-gray-600 rounded-lg p-6">
        <div className="text-xl font-bold text-gray-900 mb-4">10 REQUIRED DECISION QUESTIONS (ANSWERED FOR EVERY CONTEXT)</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white rounded p-3">
            <div className="font-bold text-blue-900">1. What is happening right now?</div>
            <div className="text-xs text-gray-600">Observed facts + signals + patterns</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-red-900">2. What is wrong or at risk?</div>
            <div className="text-xs text-gray-600">CRITICAL / UNSAFE / CONCERNING / ACCEPTABLE</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-gray-900">3. Why classified this way?</div>
            <div className="text-xs text-gray-600">Rules, thresholds, trends, baselines</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-blue-900">4. Single most important decision?</div>
            <div className="text-xs text-gray-600">Not a list. One decision.</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-green-900">5. What must happen next — and by when?</div>
            <div className="text-xs text-gray-600">Ordered actions with deadlines</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-red-900">6. What must NOT happen?</div>
            <div className="text-xs text-gray-600">Explicit prohibitions</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-blue-900">7. Who is accountable?</div>
            <div className="text-xs text-gray-600">Named role + person if available</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-orange-900">8. What happens if nothing changes?</div>
            <div className="text-xs text-gray-600">Concrete consequences</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-gray-900">9. What does system NOT know?</div>
            <div className="text-xs text-gray-600">Clinical uncertainty, missing data</div>
          </div>
          <div className="bg-white rounded p-3">
            <div className="font-bold text-yellow-900">10. What decisions are blocked?</div>
            <div className="text-xs text-gray-600">Pending human confirmation</div>
          </div>
        </div>
      </div>

      {critical.length > 0 && (
        <div className="space-y-4">
          <SystemJudgmentBanner
            classification="CRITICAL"
            count={critical.length}
            description="These situations pose imminent danger and require immediate physician intervention or emergency response."
          />
          {critical.map((decision, idx) => (
            <DecisionSpinePanel key={idx} decision={decision} />
          ))}
        </div>
      )}

      {unsafe.length > 0 && (
        <div className="space-y-4">
          <SystemJudgmentBanner
            classification="UNSAFE"
            count={unsafe.length}
            description="These situations violate safety boundaries and must be corrected immediately. Patient safety is compromised."
          />
          {unsafe.map((decision, idx) => (
            <DecisionSpinePanel key={idx} decision={decision} />
          ))}
        </div>
      )}

      {concerning.length > 0 && (
        <div className="space-y-4">
          <SystemJudgmentBanner
            classification="CONCERNING"
            count={concerning.length}
            description="These situations show patterns requiring attention before they escalate to unsafe or critical status."
          />
          {concerning.map((decision, idx) => (
            <DecisionSpinePanel key={idx} decision={decision} />
          ))}
        </div>
      )}

      {acceptable.length > 0 && (
        <div className="space-y-4">
          <SystemJudgmentBanner
            classification="ACCEPTABLE"
            count={acceptable.length}
            description="These situations are within safe operational parameters. System judges no intervention required."
          />
          {acceptable.map((decision, idx) => (
            <DecisionSpinePanel key={idx} decision={decision} />
          ))}
        </div>
      )}

      <div className="bg-gray-100 border-2 border-gray-400 rounded-lg p-6">
        <div className="text-lg font-bold text-gray-900 mb-3">DECISION SPINE: OPERATIONAL PRINCIPLES</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-bold text-gray-800 mb-2">Consistency</div>
            <div className="text-gray-600">Same 10 questions. Same order. Every context. Every screen. Every time.</div>
          </div>
          <div>
            <div className="font-bold text-gray-800 mb-2">Determinism</div>
            <div className="text-gray-600">Same inputs always produce same classification. No randomness. No ambiguity.</div>
          </div>
          <div>
            <div className="font-bold text-gray-800 mb-2">Transparency</div>
            <div className="text-gray-600">Every judgment includes full reasoning: rules, thresholds, trends, baselines.</div>
          </div>
          <div>
            <div className="font-bold text-gray-800 mb-2">Accountability</div>
            <div className="text-gray-600">Every decision names who is responsible. Never vague. Never unassigned.</div>
          </div>
          <div>
            <div className="font-bold text-gray-800 mb-2">Time-Bounded</div>
            <div className="text-gray-600">Every action has deadline. System tracks countdowns to escalation and breach.</div>
          </div>
          <div>
            <div className="font-bold text-gray-800 mb-2">Honest About Limits</div>
            <div className="text-gray-600">System explicitly states what it cannot determine. No false certainty.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
