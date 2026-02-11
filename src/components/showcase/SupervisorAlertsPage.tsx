import React from 'react';

export const SupervisorAlertsPage: React.FC = () => {
  const alerts = [
    {
      id: 1,
      priority: 'high',
      type: 'medication',
      title: 'Medication Overdue',
      resident: 'Pat Anderson',
      message: 'Lisinopril 10mg was due at 8:00 AM, not yet administered',
      time: '15 min ago',
    },
    {
      id: 2,
      priority: 'medium',
      type: 'device',
      title: 'Device Battery Low',
      resident: 'Robert Chen',
      message: 'Fall detection pendant battery at 15%',
      time: '1 hour ago',
    },
    {
      id: 3,
      priority: 'low',
      type: 'care',
      title: 'Care Log Note',
      resident: 'Maria Garcia',
      message: 'Caregiver noted reduced appetite at breakfast',
      time: '2 hours ago',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-8 shadow-lg border border-slate-200 mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Alerts & Escalations
          </h1>
          <p className="text-base text-slate-600">
            Issues requiring supervisor attention or follow-up.
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <button className="px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg shadow-lg">
            All Alerts
          </button>
          <button className="px-6 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            High Priority
          </button>
          <button className="px-6 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            Medications
          </button>
          <button className="px-6 py-3 text-base font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            Devices
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl p-5 shadow-md border-l-4 ${
                alert.priority === 'high' ? 'border-rose-500' : alert.priority === 'medium' ? 'border-amber-500' : 'border-sky-500'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 ${
                    alert.priority === 'high' ? 'bg-rose-100 text-rose-700' : alert.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {alert.priority} priority
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {alert.title}
                  </h3>
                  <div className="text-sm text-slate-600 mb-2">
                    Resident: <strong className="font-bold text-slate-900">{alert.resident}</strong>
                  </div>
                </div>
                <span className="text-sm text-slate-500 font-mono">
                  {alert.time}
                </span>
              </div>
              <p className="text-base text-slate-700 leading-relaxed mb-4">
                {alert.message}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => alert('Would acknowledge alert\n\n(Showcase Mode: no data saved)')}
                  className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 rounded-lg transition-all"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => alert('Would assign to caregiver\n\n(Showcase Mode: no data saved)')}
                  className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Assign
                </button>
                <button
                  onClick={() => alert('Would view resident profile\n\n(Showcase Mode: profile view coming soon)')}
                  className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  View Resident
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
