import React from 'react';
import { ResidentCareState } from '../services/residentCareStateService';

interface ResidentCareStateSummaryCardProps {
  state: ResidentCareState;
  compact?: boolean;
}

export function ResidentCareStateSummaryCard({ state, compact = false }: ResidentCareStateSummaryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'attention_needed':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'urgent':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'attention_needed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'Urgent Attention';
      case 'attention_needed':
        return 'Attention Needed';
      default:
        return 'All Clear';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const minutes = (new Date().getTime() - new Date(timestamp).getTime()) / (1000 * 60);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${Math.floor(minutes)}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${Math.floor(minutes % 60)}m ago`;
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border-2 ${getStatusColor(state.status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(state.status)}
            <span className="font-semibold">{getStatusLabel(state.status)}</span>
          </div>
          <div className="flex gap-3 text-sm">
            {state.summary.overdue > 0 && (
              <span className="font-bold">{state.summary.overdue} Overdue</span>
            )}
            {state.summary.dueSoon > 0 && (
              <span>{state.summary.dueSoon} Due Soon</span>
            )}
            {state.summary.activeSignals > 0 && (
              <span>{state.summary.activeSignals} Signals</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className={`px-4 py-3 border-b-2 ${getStatusColor(state.status)} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {getStatusIcon(state.status)}
          <h3 className="font-bold text-lg">{getStatusLabel(state.status)}</h3>
        </div>
        <span className="text-xs">Updated {formatTimeAgo(state.lastUpdated)}</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{state.summary.completedLast2Hours}</p>
            <p className="text-xs text-gray-600">Completed (2h)</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${state.summary.dueSoon > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
            <p className="text-2xl font-bold text-gray-900">{state.summary.dueSoon}</p>
            <p className="text-xs text-gray-600">Due Soon</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${state.summary.overdue > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
            <p className="text-2xl font-bold text-gray-900">{state.summary.overdue}</p>
            <p className="text-xs text-gray-600">Overdue</p>
          </div>
        </div>

        {state.status === 'all_clear' && state.nextScheduledAction && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-green-800">All Clear</p>
            </div>
            <p className="text-xs text-green-700">
              Next: {state.nextScheduledAction.description} in {state.nextScheduledAction.dueInMinutes}m
            </p>
          </div>
        )}

        {state.pendingActions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Pending Actions</h4>
            <div className="space-y-2">
              {state.pendingActions.slice(0, 3).map(action => (
                <div
                  key={action.id}
                  className={`p-2 rounded-lg text-sm border ${
                    action.status === 'overdue'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{action.description}</span>
                    <span className="text-xs font-bold">
                      {action.status === 'overdue'
                        ? `${action.overdueMinutes}m overdue`
                        : `${action.dueInMinutes}m`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.activeSignals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Active Signals</h4>
            <div className="space-y-2">
              {state.activeSignals.slice(0, 2).map(signal => (
                <div
                  key={signal.id}
                  className={`p-2 rounded-lg text-sm border ${
                    signal.severity === 'critical'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : signal.severity === 'high'
                      ? 'bg-orange-50 border-orange-200 text-orange-800'
                      : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  }`}
                >
                  <p className="font-medium">{signal.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.recentActions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Actions</h4>
            <div className="space-y-1">
              {state.recentActions.slice(0, 3).map(action => (
                <div key={action.id} className="flex justify-between items-center text-xs text-gray-600 py-1">
                  <span>{action.description}</span>
                  <span className="text-gray-500">
                    {formatTimeAgo(action.completedAt!)} by {action.completedBy}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
