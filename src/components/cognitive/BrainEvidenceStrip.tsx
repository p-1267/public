import React from 'react';

interface BrainEvidenceStripProps {
  lastScan: string;
  rulesEvaluated: number;
  signalsGenerated: number;
  compact?: boolean;
}

export const BrainEvidenceStrip: React.FC<BrainEvidenceStripProps> = ({
  lastScan,
  rulesEvaluated,
  signalsGenerated,
  compact = false
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-gray-900 text-white rounded-xl p-6 mb-6 shadow-2xl border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 pr-6 border-r border-white/20">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
            <div className="text-sm font-semibold tracking-wide opacity-90">LIVE MONITORING</div>
          </div>

          <div className="flex flex-col">
            <div className="text-xs opacity-60 mb-1 uppercase tracking-wider">Last Scan</div>
            <div className="text-2xl font-mono font-bold tracking-tight">{lastScan}</div>
          </div>

          <div className="flex flex-col">
            <div className="text-xs opacity-60 mb-1 uppercase tracking-wider">Rules</div>
            <div className="text-2xl font-bold">{rulesEvaluated}</div>
          </div>

          <div className="flex flex-col">
            <div className="text-xs opacity-60 mb-1 uppercase tracking-wider">Signals</div>
            <div className="text-2xl font-bold">{signalsGenerated}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/40 rounded-lg border border-slate-700/50">
          <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
          <div className="text-xs font-medium tracking-wide opacity-75">No predictions • No execution</div>
        </div>
      </div>
    </div>
  );
};
