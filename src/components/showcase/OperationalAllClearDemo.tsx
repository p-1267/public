import React from 'react';

interface Props {
  onNavigate: (path: string) => void;
}

export function OperationalAllClearDemo({ onNavigate }: Props) {
  const nextTask = {
    task_name: 'Lunch Service',
    scheduled_time: '12:00 PM',
    relative_time: 'in 2 hours 15 minutes'
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => onNavigate('/showcase/operational/context')}
          className="mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
        >
          ← Back to Context
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-4xl font-light text-gray-900 mb-2">All Clear Confirmation</h1>
            <p className="text-lg text-gray-600">
              Explicit confirmation when nothing needs attention
            </p>
          </div>

          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <h3 className="font-semibold text-blue-900 mb-2">Why This Matters:</h3>
            <div className="text-blue-800 space-y-2">
              <p>• <strong>Silence is Dangerous:</strong> In healthcare, "no news" can mean "not checked"</p>
              <p>• <strong>Explicit Confirmation:</strong> Proves caregiver reviewed resident status</p>
              <p>• <strong>Audit Trail:</strong> Timestamp shows when "all clear" was confirmed</p>
              <p>• <strong>Peace of Mind:</strong> Caregiver knows they haven't missed anything</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-lg p-8 mb-6 border-2 border-green-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500 text-white mb-6">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-3xl font-light text-gray-900 mb-3">All Clear</h2>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-center space-x-3 text-lg text-gray-700">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>All tasks completed</span>
              </div>

              <div className="flex items-center justify-center space-x-3 text-lg text-gray-700">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No active concerns</span>
              </div>

              <div className="flex items-center justify-center space-x-3 text-lg text-gray-700">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No overdue items</span>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border-2 border-green-200 mb-6">
              <div className="text-sm text-gray-600 mb-1">Next scheduled action</div>
              <div className="text-xl font-medium text-gray-900 mb-2">{nextTask.task_name}</div>
              <div className="inline-flex items-center space-x-2 text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{nextTask.relative_time}</span>
                <span className="text-gray-500">({nextTask.scheduled_time})</span>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              Resident status confirmed at {currentTime}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Alternative: "Nothing to Do" Without Confirmation</h3>

          <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl mb-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">❌</span>
              <div>
                <div className="font-medium text-red-900 mb-2">Empty Screen (BAD)</div>
                <div className="text-red-800 text-sm">
                  Just showing an empty task list or "No tasks" message creates ambiguity:
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Did the caregiver actually check?</li>
                    <li>Is the system working correctly?</li>
                    <li>Are there scheduled tasks coming up?</li>
                    <li>When was this status last verified?</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">✅</span>
              <div>
                <div className="font-medium text-green-900 mb-2">Explicit Confirmation (GOOD)</div>
                <div className="text-green-800 text-sm">
                  The All Clear card answers all questions:
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>✓ Status explicitly confirmed at specific time</li>
                    <li>✓ All three confirmation criteria listed</li>
                    <li>✓ Next action clearly displayed</li>
                    <li>✓ Creates accountability trail</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate('/showcase/operational/context')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
          >
            Back to Context Screen
          </button>
        </div>
      </div>
    </div>
  );
}
