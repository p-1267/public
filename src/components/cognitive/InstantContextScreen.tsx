import React, { useState } from 'react';
import { NowNextLater, TaskItem } from './NowNextLater';
import { IntelligenceSignalCard, IntelligenceSignal } from './IntelligenceSignalCard';
import { QuickCapturePanel } from './InlineActionPanel';

interface TimelineEvent {
  time: string;
  type: 'completed' | 'recorded' | 'noted' | 'flagged';
  description: string;
  by: string;
}

interface ResidentContext {
  id: string;
  name: string;
  room: string;
  status: 'green' | 'yellow' | 'red';
  statusReason: string;
  photo?: string;
  dob: string;
  primaryDiagnosis: string[];
  allergies: string[];
  dietRestrictions: string[];
  recentTimeline: TimelineEvent[];
  pendingTasks: TaskItem[];
  activeSignals: IntelligenceSignal[];
}

const mockContext: ResidentContext = {
  id: 'r1',
  name: 'Maria Rodriguez',
  room: '204',
  status: 'yellow',
  statusReason: '2 urgent tasks due now, medication timing pattern detected',
  dob: 'May 12, 1945',
  primaryDiagnosis: ['Hypertension', 'Type 2 Diabetes', 'Early-stage dementia'],
  allergies: ['Penicillin', 'Shellfish'],
  dietRestrictions: ['Low sodium', 'Diabetic diet'],
  recentTimeline: [
    {
      time: '8:45 AM',
      type: 'completed',
      description: 'Morning hygiene assistance completed',
      by: 'Sarah Chen'
    },
    {
      time: '8:30 AM',
      type: 'recorded',
      description: 'Blood glucose: 142 mg/dL',
      by: 'Sarah Chen'
    },
    {
      time: '8:15 AM',
      type: 'noted',
      description: 'Resident awake, alert, cooperative',
      by: 'Sarah Chen'
    },
    {
      time: '7:30 AM',
      type: 'completed',
      description: 'Room safety check completed',
      by: 'Night shift'
    }
  ],
  pendingTasks: [
    {
      id: '1',
      title: 'Morning medication - Lisinopril 10mg',
      category: 'Medication',
      dueTime: '9:00 AM',
      status: 'now',
      priority: 'urgent'
    },
    {
      id: '2',
      title: 'Blood pressure check',
      category: 'Vitals',
      dueTime: '9:15 AM',
      status: 'now',
      priority: 'high'
    }
  ],
  activeSignals: [
    {
      id: 's1',
      type: 'warning',
      title: 'Medication timing pattern',
      summary: 'Blood pressure medication has been late 3 times this week',
      timestamp: '2 min ago',
      category: 'Medication',
      why: {
        summary: 'Consistent late administration may affect medication efficacy',
        observed: ['3 late administrations in 7 days'],
        rulesFired: ['Timing deviation > 30 minutes, 3+ times'],
        dataUsed: ['medication_administration (7 days)'],
        humanAction: 'Review morning workflow timing'
      }
    }
  ]
};

export const InstantContextScreen: React.FC = () => {
  const [context, setContext] = useState<ResidentContext | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [showQuickCapture, setShowQuickCapture] = useState(false);

  const handleScan = () => {
    setContext(mockContext);
  };

  const handleTaskClick = (task: TaskItem) => {
    console.log('Task clicked:', task);
  };

  const handleStartTask = (taskId: string) => {
    console.log('Start task:', taskId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'green': return '🟢';
      case 'yellow': return '🟡';
      case 'red': return '🔴';
      default: return '⚪';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'completed': return '✓';
      case 'recorded': return '📊';
      case 'noted': return '📝';
      case 'flagged': return '⚠️';
      default: return '•';
    }
  };

  if (!context) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <a
            href="#cognitive"
            className="inline-flex items-center gap-2 text-white hover:text-blue-200 mb-4 font-medium"
          >
            ← Back to Cognitive Views
          </a>
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-6">📱</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Instant Context Access</h1>
            <p className="text-gray-600 mb-6">Scan QR code or enter room number</p>

            <div className="space-y-4">
              <button
                onClick={handleScan}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg flex items-center justify-center gap-2"
              >
                <span className="text-2xl">📷</span>
                Scan QR Code
              </button>

              <div className="text-gray-500 text-sm">or</div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  placeholder="Room number or short code"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                />
                <button
                  onClick={handleScan}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                >
                  Go
                </button>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              Zero navigation • Instant access • Action-ready
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <a
            href="#cognitive"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium"
          >
            ← Cognitive Views
          </a>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setContext(null)}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to scan
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {context.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{context.name}</h1>
                <div className="text-gray-600">Room {context.room} • Born {context.dob}</div>
              </div>
            </div>
            <div className="text-5xl">{getStatusIcon(context.status)}</div>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4">
            <div className="font-semibold text-yellow-900 text-sm mb-1">Current Status:</div>
            <div className="text-yellow-800">{context.statusReason}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-gray-700 mb-1">Primary Diagnosis:</div>
              <ul className="space-y-1">
                {context.primaryDiagnosis.map((d, i) => (
                  <li key={i} className="text-gray-600">• {d}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-red-700 mb-1">⚠️ Allergies:</div>
              <ul className="space-y-1">
                {context.allergies.map((a, i) => (
                  <li key={i} className="text-red-600 font-medium">• {a}</li>
                ))}
              </ul>
            </div>
          </div>

          {context.dietRestrictions.length > 0 && (
            <div className="mt-3 text-sm">
              <div className="font-semibold text-gray-700 mb-1">Diet Restrictions:</div>
              <div className="text-gray-600">{context.dietRestrictions.join(', ')}</div>
            </div>
          )}
        </div>

        {showQuickCapture && (
          <QuickCapturePanel
            residentName={context.name}
            onCapture={(type, data) => {
              console.log('Capture:', type, data);
              setShowQuickCapture(false);
            }}
            onClose={() => setShowQuickCapture(false)}
          />
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity (Last 90 min)</h2>
          <div className="space-y-3">
            {context.recentTimeline.map((event, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="text-xs text-gray-500 w-16 flex-shrink-0">{event.time}</div>
                <div className="flex-1 bg-gray-50 rounded p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">{getEventIcon(event.type)}</span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{event.description}</div>
                      <div className="text-xs text-gray-500 mt-1">by {event.by}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {context.activeSignals.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Active Intelligence Signals</h2>
            {context.activeSignals.map(signal => (
              <IntelligenceSignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Tasks for {context.name}</h2>
          <NowNextLater
            tasks={context.pendingTasks}
            onTaskClick={handleTaskClick}
            onStartTask={handleStartTask}
            compact
          />
        </div>

        <button
          onClick={() => setShowQuickCapture(true)}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg shadow-lg"
        >
          Quick Actions
        </button>
      </div>
    </div>
  );
};
