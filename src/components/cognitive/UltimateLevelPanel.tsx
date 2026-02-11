import React, { useState } from 'react';

export const UltimateLevelPanel: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-6 mb-6 shadow-2xl border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl">✨</div>
          <div>
            <div className="font-bold text-2xl mb-1">Intelligence Level Status</div>
            <div className="text-base text-emerald-300 font-semibold">Level 3 Active • Level 4 Active</div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg border border-slate-600 font-semibold transition-all"
        >
          {expanded ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {expanded && (
        <div className="mt-6 space-y-4 border-t border-slate-700 pt-6">
          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-xl p-5 border border-emerald-700/50">
            <div className="font-bold text-lg mb-3 flex items-center gap-3">
              <span className="text-2xl text-emerald-400">✓</span>
              <span>Level 3: Correlation + Explainability (ACTIVE)</span>
            </div>
            <div className="text-base text-emerald-100 space-y-2 ml-10">
              <div>• Detects patterns across time windows</div>
              <div>• Correlates events across care categories</div>
              <div>• Provides full reasoning transparency</div>
              <div>• Shows data sources and rules fired</div>
              <div>• States explicit boundaries (no diagnosis, no prediction)</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 rounded-xl p-5 border border-emerald-700/50">
            <div className="font-bold text-lg mb-3 flex items-center gap-3">
              <span className="text-2xl text-emerald-400">✓</span>
              <span>Level 4: Predictive Intelligence (ACTIVE)</span>
            </div>
            <div className="text-base text-emerald-100 space-y-2 ml-10">
              <div>• Risk forecasting based on historical patterns</div>
              <div>• Predicted likelihood of future events</div>
              <div>• Confidence intervals for predictions</div>
              <div>• Early warning indicators</div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 text-sm text-slate-300 border border-slate-700">
            <div className="font-bold mb-3 text-slate-200 text-base">How Level 4 Works:</div>
            <div className="space-y-2 ml-4">
              <div>1. Analyzes historical resident data to identify patterns</div>
              <div>2. Generates probability estimates for potential events</div>
              <div>3. Provides confidence intervals and uncertainty measures</div>
              <div>4. All predictions require human review and validation</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
