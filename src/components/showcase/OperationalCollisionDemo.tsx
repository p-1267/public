import React, { useState } from 'react';

interface Props {
  onNavigate: (path: string) => void;
}

export function OperationalCollisionDemo({ onNavigate }: Props) {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [overrideComplete, setOverrideComplete] = useState(false);

  const predefinedReasons = [
    'Emergency situation requires immediate action',
    'Confirmed with other caregiver to take over',
    'Other caregiver is unavailable',
    'Coordination issue - resident needs immediate care',
    'Other (specify below)'
  ];

  const handleOverride = () => {
    setOverrideComplete(true);
    setShowOverrideModal(false);
    setTimeout(() => setOverrideComplete(false), 3000);
  };

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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-4xl font-light text-gray-900 mb-2">Collision Detection Demo</h1>
            <p className="text-lg text-gray-600">
              Preventing duplicate work and coordination failures
            </p>
          </div>

          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <h3 className="font-semibold text-blue-900 mb-2">Scenario:</h3>
            <div className="text-blue-800 space-y-2">
              <p>• Caregiver A (Sarah) started "Morning Medications" task at 8:15 AM</p>
              <p>• Caregiver B (Michael) scans same resident QR at 8:20 AM</p>
              <p>• System detects collision and shows warning</p>
            </div>
          </div>

          <div className="border-2 border-red-500 rounded-2xl p-6 bg-red-50">
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-500 rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <div className="font-semibold text-amber-900">Task In Progress</div>
                    <div className="text-amber-700 text-sm mt-1">
                      Currently being worked on by <span className="font-medium">Sarah Johnson</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowOverrideModal(true)}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-all"
                >
                  Override
                </button>
              </div>

              <div className="mt-3 p-3 bg-white rounded-lg text-sm text-gray-700">
                <div className="font-medium mb-1">Coordination Notice:</div>
                <div>
                  This task is already being handled. Proceeding may cause duplicate work or coordination issues.
                  Only override if you have confirmed with the other caregiver or in an emergency.
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">🔵</span>
                  <h3 className="text-xl font-medium text-gray-900">Morning Medications</h3>
                </div>
                <div className="inline-block px-3 py-1 rounded-lg bg-white text-sm text-gray-700">
                  Medication
                </div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Started by: Sarah Johnson</div>
                <div>Started at: 8:15 AM</div>
                <div className="text-blue-600 font-medium mt-1">In Progress (5 min)</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('/showcase/operational/context')}
                className="p-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-medium transition-all"
              >
                Skip & View Other Tasks
              </button>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition-all"
              >
                Override & Take Over
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Why Collision Detection Matters</h3>
          <div className="space-y-4 text-gray-700">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <div className="font-medium">Prevents Duplicate Work</div>
                <div className="text-sm text-gray-600">
                  Avoids two caregivers administering same medication or performing same care action
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">📋</span>
              <div>
                <div className="font-medium">Creates Audit Trail</div>
                <div className="text-sm text-gray-600">
                  Every override is logged with reason, timestamp, and involved caregivers
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🤝</span>
              <div>
                <div className="font-medium">Encourages Coordination</div>
                <div className="text-sm text-gray-600">
                  Forces communication between caregivers before proceeding
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-3xl font-light text-gray-900 mb-2">Override Task Ownership</h2>
                <p className="text-lg text-gray-600">
                  This task is currently being handled by <span className="font-medium">Sarah Johnson</span>
                </p>
              </div>

              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-500 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <div className="font-semibold text-amber-900 mb-1">Important</div>
                    <div className="text-amber-800 text-sm">
                      Overriding a task may cause duplicate work or coordination issues.
                      Only proceed if you have confirmed with the other caregiver or in an emergency situation.
                      This action will be logged and audited.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <label className="block text-gray-700 text-lg font-medium mb-2">
                  Select reason for override:
                </label>

                <div className="space-y-2">
                  {predefinedReasons.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedReason === reason
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <span className="text-gray-900">{reason}</span>
                    </label>
                  ))}
                </div>

                {selectedReason === 'Other (specify below)' && (
                  <div className="mt-4">
                    <label className="block text-gray-700 mb-2">Specify reason:</label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Please provide a detailed reason for this override..."
                      rows={4}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-lg resize-none"
                      maxLength={500}
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                      {customReason.length}/500 characters
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowOverrideModal(false);
                    setSelectedReason('');
                    setCustomReason('');
                  }}
                  className="flex-1 p-4 rounded-2xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOverride}
                  disabled={!selectedReason || (selectedReason === 'Other (specify below)' && !customReason.trim())}
                  className="flex-1 p-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Override
                </button>
              </div>

              <div className="mt-4 text-center text-sm text-gray-500">
                This override will be recorded in the audit log
              </div>
            </div>
          </div>
        </div>
      )}

      {overrideComplete && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-lg">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-medium">Override Logged</div>
              <div className="text-sm opacity-90">Task ownership transferred to Michael Torres</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
