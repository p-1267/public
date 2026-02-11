import React from 'react';

interface ChangeEvent {
  id: string;
  type: 'new' | 'updated' | 'completed' | 'flagged';
  description: string;
  timestamp: string;
  category: string;
  resident?: string;
}

interface ChangeDetectionPanelProps {
  changes: ChangeEvent[];
  lastCheckTime?: string;
  title?: string;
}

export const ChangeDetectionPanel: React.FC<ChangeDetectionPanelProps> = ({
  changes,
  lastCheckTime = '30 minutes ago',
  title = 'Changes Since Last Check'
}) => {
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'new': return '🆕';
      case 'updated': return '🔄';
      case 'completed': return '✅';
      case 'flagged': return '⚠️';
      default: return '•';
    }
  };

  const getChangeStyle = (type: string) => {
    switch (type) {
      case 'new': return 'bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500';
      case 'updated': return 'bg-gradient-to-r from-sky-50 to-blue-50 border-l-4 border-sky-500';
      case 'completed': return 'bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-500';
      case 'flagged': return 'bg-gradient-to-r from-rose-50 to-red-50 border-l-4 border-rose-500';
      default: return 'bg-slate-50 border-l-4 border-slate-400';
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-6 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <span className="text-3xl">🔍</span>
          {title}
        </h3>
        <div className="text-sm text-slate-500 font-medium">
          Last check: <span className="font-mono font-semibold text-slate-700">{lastCheckTime}</span>
        </div>
      </div>

      {changes.length === 0 ? (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-8 text-center">
          <div className="text-emerald-700 text-lg font-semibold mb-2">
            ✓ No changes detected in last {lastCheckTime}
          </div>
          <div className="text-sm text-emerald-600">
            System is monitoring continuously
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map(change => (
            <div
              key={change.id}
              className={`${getChangeStyle(change.type)} rounded-lg p-4 shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{getChangeIcon(change.type)}</span>
                  <div className="flex-1">
                    <div className="text-base font-bold text-slate-900 mb-1">{change.description}</div>
                    {change.resident && (
                      <div className="text-sm text-slate-600 font-medium">{change.resident}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-semibold">
                      {change.category}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-600 font-mono font-semibold ml-4">{change.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
