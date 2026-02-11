import React from 'react';

interface MetricBlock {
  label: string;
  value: string | number;
  status: 'urgent' | 'attention' | 'normal' | 'good';
  unit?: string;
  delta?: string;
}

interface NumericEvidenceProps {
  metrics: MetricBlock[];
}

export const NumericEvidence: React.FC<NumericEvidenceProps> = ({ metrics }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-2xl shadow-red-500/30';
      case 'attention':
        return 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-2xl shadow-amber-500/30';
      case 'good':
        return 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-2xl shadow-emerald-500/30';
      default:
        return 'bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-xl';
    }
  };

  return (
    <div className="grid grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, i) => (
        <div
          key={i}
          className={`rounded-2xl p-8 ${getStatusStyle(metric.status)} transform transition-all hover:scale-105`}
        >
          <div className="text-sm font-bold mb-3 uppercase tracking-widest opacity-90">
            {metric.label}
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-5xl font-black tracking-tight">{metric.value}</div>
            {metric.unit && <div className="text-2xl font-semibold opacity-80">{metric.unit}</div>}
          </div>
          {metric.delta && (
            <div className="text-xs font-bold mt-3 opacity-90">{metric.delta}</div>
          )}
        </div>
      ))}
    </div>
  );
};
