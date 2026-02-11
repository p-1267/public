import React from 'react';

interface ActivityMetric {
  category: string;
  icon: string;
  count: number;
  lastAction: string;
  missedYesterday?: boolean;
  intakePercent?: number;
  details?: string;
}

interface CareActivityEvidenceProps {
  activities: ActivityMetric[];
  residentName?: string;
}

export const CareActivityEvidence: React.FC<CareActivityEvidenceProps> = ({
  activities,
  residentName
}) => {
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-6 mb-6 shadow-lg">
      <h3 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-3">
        <span className="text-3xl">📊</span>
        Daily Care Activity Evidence {residentName && `- ${residentName}`}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activities.map((activity, i) => (
          <div
            key={i}
            className={`rounded-xl p-5 shadow-md ${
              activity.missedYesterday
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300'
                : 'bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{activity.icon}</span>
              <div className="font-bold text-slate-900 text-lg">{activity.category}</div>
            </div>

            {activity.count === 0 ? (
              <div className="text-sm text-slate-600 font-semibold mb-2 flex items-center gap-2">
                <span className="text-amber-500">⚠️</span>
                No activity recorded today
              </div>
            ) : (
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {activity.count}
              </div>
            )}

            <div className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">
              Last: <span className="font-mono text-slate-700">{activity.lastAction}</span>
            </div>

            {activity.intakePercent !== undefined && (
              <div className="mt-3 bg-white/80 backdrop-blur rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-600 mb-2 uppercase tracking-wider font-semibold">Intake</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        activity.intakePercent >= 80 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                        activity.intakePercent >= 50 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                        'bg-gradient-to-r from-rose-400 to-red-500'
                      }`}
                      style={{ width: `${activity.intakePercent}%` }}
                    ></div>
                  </div>
                  <div className={`text-xl font-bold ${
                    activity.intakePercent >= 80 ? 'text-emerald-700' :
                    activity.intakePercent >= 50 ? 'text-amber-700' :
                    'text-rose-700'
                  }`}>
                    {activity.intakePercent}%
                  </div>
                </div>
              </div>
            )}

            {activity.missedYesterday && (
              <div className="mt-3 text-sm text-amber-700 font-bold bg-amber-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <span>⚠️</span> Missed yesterday
              </div>
            )}

            {activity.details && (
              <div className="mt-3 text-sm text-slate-600 bg-white/60 rounded-lg px-3 py-2">
                {activity.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
