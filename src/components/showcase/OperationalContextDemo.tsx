import React, { useState } from 'react';

interface Props {
  onNavigate: (path: string) => void;
}

export function OperationalContextDemo({ onNavigate }: Props) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const mockResident = {
    full_name: 'Margaret Chen',
    room_number: '204B',
    initials: 'MC'
  };

  const mockTasks = [
    {
      id: '1',
      task_name: 'Morning Medications',
      priority: 'high',
      state: 'overdue',
      category: 'Clinical',
      scheduled_start: '8:00 AM',
      requires_evidence: true
    },
    {
      id: '2',
      task_name: 'Blood Pressure Check',
      priority: 'medium',
      state: 'due',
      category: 'Clinical',
      scheduled_start: '9:00 AM',
      requires_evidence: true
    },
    {
      id: '3',
      task_name: 'Assist with Shower',
      priority: 'medium',
      state: 'due',
      category: 'Hygiene',
      scheduled_start: '9:30 AM',
      requires_evidence: false
    },
    {
      id: '4',
      task_name: 'Oral Care',
      priority: 'medium',
      state: 'due',
      category: 'Hygiene',
      scheduled_start: '10:00 AM',
      requires_evidence: false
    },
    {
      id: '5',
      task_name: 'Serve Lunch - 1200 cal target',
      priority: 'high',
      state: 'due',
      category: 'Nutrition',
      scheduled_start: '12:00 PM',
      requires_evidence: true
    },
    {
      id: '6',
      task_name: 'Clean Room 204B',
      priority: 'low',
      state: 'scheduled',
      category: 'Housekeeping',
      scheduled_start: '2:00 PM',
      requires_evidence: false
    },
    {
      id: '7',
      task_name: 'Change Bed Linens',
      priority: 'medium',
      state: 'scheduled',
      category: 'Housekeeping',
      scheduled_start: '2:30 PM',
      requires_evidence: false
    },
    {
      id: '8',
      task_name: 'Vacuum Common Area',
      priority: 'low',
      state: 'scheduled',
      category: 'Cleaning',
      scheduled_start: '3:00 PM',
      requires_evidence: false
    },
    {
      id: '9',
      task_name: 'Hourly Safety Check',
      priority: 'high',
      state: 'due',
      category: 'Monitoring',
      scheduled_start: '1:00 PM',
      requires_evidence: true
    },
    {
      id: '10',
      task_name: 'Prepare Diabetic Snack',
      priority: 'medium',
      state: 'scheduled',
      category: 'Cooking',
      scheduled_start: '3:30 PM',
      requires_evidence: false
    }
  ];

  const mockRecentActions = [
    {
      id: '1',
      description: 'Breakfast served - resident ate 75% of meal (480 calories)',
      performed_by: 'Sarah Johnson',
      time: '15m ago'
    },
    {
      id: '2',
      description: 'Vital signs recorded: BP 128/82, Temp 98.4°F, Pulse 76',
      performed_by: 'Michael Torres',
      time: '45m ago'
    },
    {
      id: '3',
      description: 'Room cleaned and organized - no safety hazards observed',
      performed_by: 'Sarah Johnson',
      time: '1h ago'
    },
    {
      id: '4',
      description: 'Oral care completed - dentures cleaned',
      performed_by: 'Michael Torres',
      time: '2h ago'
    }
  ];

  const mockSignals = [
    {
      id: '1',
      type: 'Pattern Alert',
      severity: 'MEDIUM',
      message: 'Blood pressure trending higher than baseline over last 3 days',
      time: '2h ago'
    },
    {
      id: '2',
      type: 'Medication Warning',
      severity: 'HIGH',
      message: 'Morning medication window closing soon (due by 10:00 AM)',
      time: '10m ago'
    }
  ];

  const getLiveCareState = () => {
    const overdue = mockTasks.filter(t => t.state === 'overdue').length;
    if (overdue > 0) return { status: 'overdue', label: 'Overdue Tasks', color: 'bg-red-500', count: overdue };

    const due = mockTasks.filter(t => t.state === 'due').length;
    if (due > 0) return { status: 'pending', label: 'Pending Tasks', color: 'bg-amber-500', count: due };

    return { status: 'done', label: 'All Current Tasks Complete', color: 'bg-green-500', count: 0 };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-amber-500 bg-amber-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getStateIndicator = (state: string) => {
    switch (state) {
      case 'overdue': return '🔴';
      case 'due': return '🟡';
      case 'in_progress': return '🔵';
      default: return '⚪';
    }
  };

  const handleTaskAction = (taskId: string, action: string) => {
    setSelectedAction(`${action} - ${taskId}`);
    setTimeout(() => setSelectedAction(null), 2000);
  };

  const careState = getLiveCareState();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => onNavigate('/showcase/operational/lookup')}
          className="mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
        >
          ← Back to Lookup
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                {mockResident.initials}
              </div>
              <div>
                <h1 className="text-4xl font-light text-gray-900">{mockResident.full_name}</h1>
                <p className="text-xl text-gray-600 mt-1">Room {mockResident.room_number}</p>
              </div>
            </div>

            <div className={`px-6 py-3 rounded-2xl ${careState.color} text-white`}>
              <div className="text-sm font-medium opacity-90">LIVE STATUS</div>
              <div className="text-xl font-semibold">{careState.label}</div>
              {careState.count > 0 && (
                <div className="text-sm opacity-90 mt-1">{careState.count} tasks</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-light text-gray-900 mb-4">🧠 Intelligence Signals</h2>
          <div className="space-y-3">
            {mockSignals.map(signal => (
              <div
                key={signal.id}
                className={`p-4 rounded-2xl border-2 ${
                  signal.severity === 'HIGH' ? 'border-red-500 bg-red-50' :
                  signal.severity === 'MEDIUM' ? 'border-amber-500 bg-amber-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{signal.type}</div>
                    <div className="text-gray-700 mt-1">{signal.message}</div>
                  </div>
                  <div className="text-sm text-gray-500">{signal.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-light text-gray-900">📋 Current Tasks</h2>
            <button
              onClick={() => onNavigate('/showcase/operational/collision')}
              className="px-4 py-2 text-sm bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200 transition-all"
            >
              View Collision Demo →
            </button>
          </div>
          <div className="space-y-4">
            {mockTasks.map(task => (
              <div key={task.id} className={`border-2 rounded-2xl p-6 ${getPriorityColor(task.priority)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getStateIndicator(task.state)}</span>
                      <h3 className="text-xl font-medium text-gray-900">{task.task_name}</h3>
                    </div>
                    <div className="inline-block px-3 py-1 rounded-lg bg-white text-sm text-gray-700">
                      {task.category}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>Due: {task.scheduled_start}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleTaskAction(task.id, 'start')}
                    className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleTaskAction(task.id, 'complete')}
                    className="p-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-all"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => handleTaskAction(task.id, 'problem')}
                    className="p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition-all"
                  >
                    Problem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-light text-gray-900 mb-4">⏱ Recent Actions (90 min)</h2>
          <div className="space-y-3">
            {mockRecentActions.map(action => (
              <div key={action.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl">📝</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{action.description}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    by {action.performed_by} · {action.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleTaskAction('vitals', 'record')}
            className="p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-blue-500 transition-all"
          >
            <div className="text-3xl mb-2">❤️</div>
            <div className="text-lg font-medium text-gray-900">Record Vitals</div>
          </button>
          <button
            onClick={() => onNavigate('/showcase/operational/voice')}
            className="p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-blue-500 transition-all"
          >
            <div className="text-3xl mb-2">🎤</div>
            <div className="text-lg font-medium text-gray-900">Add Concern (Voice)</div>
          </button>
        </div>
      </div>

      {selectedAction && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg animate-fade-in">
          ✓ Demo Action: {selectedAction}
        </div>
      )}
    </div>
  );
}
