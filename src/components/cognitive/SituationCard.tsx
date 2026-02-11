import React from 'react';

export interface ResidentSituation {
  id: string;
  name: string;
  room: string;
  status: 'green' | 'yellow' | 'red';
  statusReason: string;
  lastUpdate: string;
  completedToday: number;
  pendingNow: number;
  overdueCount: number;
  activeSignals: number;
  inProgressBy?: string;
  nextScheduled?: string;
}

interface SituationCardProps {
  situation: ResidentSituation;
  onClick: () => void;
  compact?: boolean;
}

export const SituationCard: React.FC<SituationCardProps> = ({
  situation,
  onClick,
  compact = false
}) => {
  const getStatusDisplay = () => {
    switch (situation.status) {
      case 'green': return { icon: '🟢', text: 'All Clear', color: 'text-green-600' };
      case 'yellow': return { icon: '🟡', text: 'Needs Attention', color: 'text-yellow-600' };
      case 'red': return { icon: '🔴', text: 'Urgent', color: 'text-red-600' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all ${
        situation.status === 'red' ? 'border-red-300' :
        situation.status === 'yellow' ? 'border-yellow-300' :
        'border-green-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-lg">{situation.name}</div>
          <div className="text-sm text-gray-600">Room {situation.room}</div>
        </div>
        <div className="text-3xl">{statusDisplay.icon}</div>
      </div>

      <div className={`font-semibold ${statusDisplay.color} mb-2`}>
        {statusDisplay.text}
      </div>

      <div className="text-sm text-gray-700 mb-3 italic">
        {situation.statusReason}
      </div>

      {situation.inProgressBy && (
        <div className="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1 mb-2">
          🔄 Task in progress by {situation.inProgressBy}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-50 rounded p-2 text-center">
          <div className="font-bold text-lg">{situation.completedToday}</div>
          <div className="text-gray-600">Done</div>
        </div>
        <div className="bg-orange-50 rounded p-2 text-center">
          <div className="font-bold text-lg">{situation.pendingNow}</div>
          <div className="text-gray-600">Pending</div>
        </div>
        {situation.overdueCount > 0 && (
          <div className="bg-red-50 rounded p-2 text-center">
            <div className="font-bold text-lg text-red-600">{situation.overdueCount}</div>
            <div className="text-red-600">Overdue</div>
          </div>
        )}
      </div>

      {situation.activeSignals > 0 && (
        <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1">
          💡 {situation.activeSignals} intelligence signal{situation.activeSignals > 1 ? 's' : ''}
        </div>
      )}

      {situation.nextScheduled && (
        <div className="mt-2 text-xs text-gray-600">
          Next: {situation.nextScheduled}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Last update: {situation.lastUpdate}
      </div>
    </div>
  );
};
