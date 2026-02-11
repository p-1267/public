import React, { useState } from 'react';

interface ActionButton {
  label: string;
  icon?: string;
  action: () => void;
  variant?: 'primary' | 'danger' | 'success' | 'secondary';
}

interface InlineActionPanelProps {
  title: string;
  subtitle?: string;
  actions: ActionButton[];
  children?: React.ReactNode;
  onClose?: () => void;
}

export const InlineActionPanel: React.FC<InlineActionPanelProps> = ({
  title,
  subtitle,
  actions,
  children,
  onClose
}) => {
  const getButtonStyle = (variant: string = 'secondary') => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-gray-200 hover:bg-gray-300 text-gray-900';
    }
  };

  return (
    <div className="bg-white border-2 border-blue-400 rounded-xl shadow-xl p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      {children && <div className="mb-4">{children}</div>}

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.action}
            className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${getButtonStyle(action.variant)}`}
          >
            {action.icon && <span className="text-lg">{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

interface QuickCaptureProps {
  residentName: string;
  onCapture: (type: string, data: any) => void;
  onClose: () => void;
}

export const QuickCapturePanel: React.FC<QuickCaptureProps> = ({
  residentName,
  onCapture,
  onClose
}) => {
  const [captureType, setCaptureType] = useState<string | null>(null);
  const [note, setNote] = useState('');

  if (captureType === 'note') {
    return (
      <InlineActionPanel
        title="Add Note"
        subtitle={residentName}
        actions={[
          {
            label: 'Cancel',
            action: () => setCaptureType(null)
          },
          {
            label: 'Save Note',
            icon: '✓',
            variant: 'success',
            action: () => {
              onCapture('note', { text: note });
              onClose();
            }
          }
        ]}
      >
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter your note..."
          className="w-full p-3 border rounded-lg min-h-24 text-sm"
          autoFocus
        />
      </InlineActionPanel>
    );
  }

  return (
    <InlineActionPanel
      title="Quick Actions"
      subtitle={residentName}
      actions={[
        {
          label: 'Record Vitals',
          icon: '🩺',
          variant: 'primary',
          action: () => onCapture('vitals', {})
        },
        {
          label: 'Add Note',
          icon: '📝',
          action: () => setCaptureType('note')
        },
        {
          label: 'Voice Entry',
          icon: '🎤',
          variant: 'primary',
          action: () => onCapture('voice', {})
        },
        {
          label: 'Take Photo',
          icon: '📸',
          action: () => onCapture('photo', {})
        },
        {
          label: 'Report Incident',
          icon: '⚠️',
          variant: 'danger',
          action: () => onCapture('incident', {})
        },
        {
          label: 'Close',
          action: onClose
        }
      ]}
      onClose={onClose}
    />
  );
};
