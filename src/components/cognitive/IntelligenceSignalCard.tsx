import React, { useState } from 'react';
import { WhyExplanation, WhyData } from './WhyExplanation';

export interface IntelligenceSignal {
  id: string;
  type: 'warning' | 'info' | 'urgent' | 'pattern' | 'anomaly';
  title: string;
  summary: string;
  timestamp: string;
  residentName?: string;
  category?: string;
  why: WhyData;
  actionable?: boolean;
  suggestedAction?: string;
}

interface IntelligenceSignalCardProps {
  signal: IntelligenceSignal;
  onAction?: (signalId: string) => void;
  compact?: boolean;
}

export const IntelligenceSignalCard: React.FC<IntelligenceSignalCardProps> = ({
  signal,
  onAction,
  compact = false
}) => {
  const [showWhy, setShowWhy] = useState(false);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'warning':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'pattern':
        return 'bg-blue-50 border-blue-300 text-blue-900';
      case 'anomaly':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent': return '🚨';
      case 'warning': return '⚠️';
      case 'pattern': return '📊';
      case 'anomaly': return '⚡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 ${getTypeStyle(signal.type)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getTypeIcon(signal.type)}</span>
          <div>
            <h3 className="font-semibold">{signal.title}</h3>
            {signal.residentName && (
              <div className="text-xs opacity-75 mt-0.5">{signal.residentName}</div>
            )}
          </div>
        </div>
        <div className="text-xs opacity-75">{signal.timestamp}</div>
      </div>

      <p className="text-sm mb-3">{signal.summary}</p>

      {signal.category && (
        <div className="text-xs mb-2">
          <span className="px-2 py-1 bg-white/50 rounded">{signal.category}</span>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <button
          onClick={() => setShowWhy(!showWhy)}
          className="text-xs px-3 py-1 bg-white/80 hover:bg-white rounded font-medium"
        >
          {showWhy ? 'Hide' : 'Why?'}
        </button>

        {signal.actionable && onAction && (
          <button
            onClick={() => onAction(signal.id)}
            className="text-xs px-3 py-1 bg-white hover:bg-gray-50 rounded font-medium"
          >
            {signal.suggestedAction || 'Take Action'}
          </button>
        )}
      </div>

      {showWhy && (
        <div className="mt-3">
          <WhyExplanation why={signal.why} />
        </div>
      )}
    </div>
  );
};
