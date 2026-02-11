import React, { useEffect } from 'react';

interface TaskAlertProps {
  message: string;
  severity?: 'info' | 'warning' | 'urgent' | 'critical';
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function TaskAlert({
  message,
  severity = 'info',
  onClose,
  autoClose = true,
  duration = 3000
}: TaskAlertProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const getSeverityStyles = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 border-red-700';
      case 'urgent':
        return 'bg-orange-500 border-orange-700';
      case 'warning':
        return 'bg-amber-500 border-amber-700';
      default:
        return 'bg-blue-500 border-blue-700';
    }
  };

  const getSeverityIcon = () => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'urgent': return '🔴';
      case 'warning': return '🟡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div
        className={`${getSeverityStyles()} text-white rounded-2xl px-6 py-4 shadow-2xl border-2 flex items-center space-x-4 min-w-[300px] max-w-md`}
      >
        <span className="text-3xl">{getSeverityIcon()}</span>
        <p className="flex-1 text-lg font-medium">{message}</p>
        {!autoClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
