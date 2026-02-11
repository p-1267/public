import React from 'react';
import type { IntelligenceSignal } from '../services/orchestrationLayer';

interface IntelligenceSignalPanelProps {
  signals: IntelligenceSignal[];
  onDismiss?: (signalId: string) => void;
  onAcknowledge?: (signalId: string) => void;
}

export function IntelligenceSignalPanel({ signals, onDismiss, onAcknowledge }: IntelligenceSignalPanelProps) {
  if (signals.length === 0) {
    return null;
  }

  const priorityStyles = {
    HIGH: 'bg-red-50 border-red-300',
    MEDIUM: 'bg-yellow-50 border-yellow-300',
    LOW: 'bg-blue-50 border-blue-300'
  };

  const priorityBadgeStyles = {
    HIGH: 'bg-red-200 text-red-800',
    MEDIUM: 'bg-yellow-200 text-yellow-800',
    LOW: 'bg-blue-200 text-blue-800'
  };

  const typeIcons = {
    MISSED_DOSE: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
    ),
    COMPLIANCE_GAP: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    ANALYTICS_INSIGHT: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
    DEVICE_ALERT: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
      </svg>
    )
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
        </svg>
        <h3 className="font-bold text-gray-900">Intelligence Signals</h3>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
          {signals.length} active
        </span>
      </div>

      <div className="space-y-3">
        {signals.map(signal => (
          <div
            key={signal.id}
            className={`border-2 rounded-lg p-3 ${priorityStyles[signal.priority]}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="text-gray-700">
                  {typeIcons[signal.type]}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{signal.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${priorityBadgeStyles[signal.priority]}`}>
                    {signal.priority}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-2">{signal.description}</p>

            <div className="bg-white bg-opacity-70 rounded p-2 mb-2">
              <p className="text-xs font-semibold text-gray-800 mb-1">Intelligence Signal - Requires Human Review</p>
              <p className="text-xs text-gray-700 mb-1">
                <span className="font-semibold">Reasoning:</span> {signal.reasoning}
              </p>
              <p className="text-xs text-gray-700">
                <span className="font-semibold">Action Required:</span> {signal.actionRequired}
              </p>
            </div>

            <div className="text-xs text-gray-600 mb-2">
              <span className="font-semibold">Authorized Roles:</span> {signal.authorizedRoles.join(', ')}
            </div>

            <div className="flex gap-2">
              {onAcknowledge && (
                <button
                  onClick={() => onAcknowledge(signal.id)}
                  className="flex-1 bg-gray-700 text-white text-xs font-semibold py-2 px-3 rounded hover:bg-gray-800 transition-colors"
                >
                  Acknowledge
                </button>
              )}
              {signal.dismissible && onDismiss && (
                <button
                  onClick={() => onDismiss(signal.id)}
                  className="flex-1 bg-gray-200 text-gray-700 text-xs font-semibold py-2 px-3 rounded hover:bg-gray-300 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
