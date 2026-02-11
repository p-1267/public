import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TelemetryTracker } from '../services/telemetryTracking';
import {
  getQuickTapValuesForTaskType,
  checkTaskException,
  getExceptionMessage,
} from '../services/exceptionDetection';

interface QuickTapTaskCompletionProps {
  task: {
    id: string;
    title: string;
    category: string;
    residentName: string;
  };
  onComplete: () => void;
  onCancel: () => void;
}

const telemetry = new TelemetryTracker();

export function QuickTapTaskCompletion({
  task,
  onComplete,
  onCancel,
}: QuickTapTaskCompletionProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [isException, setIsException] = useState(false);
  const [exceptionMessage, setExceptionMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);

  const quickValues = getQuickTapValuesForTaskType(task.category);

  useEffect(() => {
    telemetry.startTracking(task.id);
  }, [task.id]);

  const handleQuickSelect = async (value: string) => {
    telemetry.recordTap();
    setSelectedValue(value);

    // Check for exceptions based on value
    // For demo, we'll mark certain values as exceptions
    const exceptionValues = ['refused', 'held', '0', '0oz', 'abnormal'];
    if (exceptionValues.includes(value)) {
      setIsException(true);
      setExceptionMessage(
        'This response requires additional documentation and evidence.'
      );
      setShowFullForm(true);
    } else {
      // Quick complete for normal values
      await handleQuickComplete(value);
    }
  };

  const handleQuickComplete = async (value: string) => {
    setSubmitting(true);

    try {
      const completionSeconds = telemetry.getElapsedSeconds();

      const { error } = await supabase.rpc('quick_tap_complete_task', {
        p_task_id: task.id,
        p_outcome: 'success',
        p_quick_value: value,
        p_tap_count: telemetry.getTapCount(),
        p_completion_seconds: completionSeconds,
      });

      if (error) throw error;

      await telemetry.recordCompletion('quick_tap', false);

      onComplete();
    } catch (error) {
      console.error('Quick complete failed:', error);
      alert('Failed to complete task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllClear = async () => {
    telemetry.recordTap();
    await handleQuickComplete('normal');
  };

  if (showFullForm) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
          <p className="text-sm text-gray-600">{task.residentName}</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-yellow-900">Exception Detected</p>
              <p className="text-sm text-yellow-800">{exceptionMessage}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for deviation
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3"
              rows={3}
              placeholder="Explain why task could not be completed as usual..."
              onChange={(e) => telemetry.recordTyping(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence required
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-600">
                Capture photo or record voice note
              </p>
              <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                Add Evidence
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                telemetry.recordCompletion('exception_form', true, {
                  exceptionReason: selectedValue || 'deviation',
                  evidenceCount: 1,
                });
                onComplete();
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
            >
              Submit Exception Report
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
        <p className="text-sm text-gray-600">{task.residentName}</p>
      </div>

      {quickValues.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Quick response:</p>
          <div className="grid grid-cols-2 gap-3">
            {quickValues.map((option) => (
              <button
                key={option.value}
                onClick={() => handleQuickSelect(option.value)}
                disabled={submitting}
                className="flex items-center justify-center gap-2 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {option.icon && <span className="text-2xl">{option.icon}</span>}
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={handleAllClear}
          disabled={submitting}
          className="w-full py-4 bg-green-600 text-white rounded-lg text-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          ✓ All Normal
        </button>
      )}

      <div className="mt-4 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>

      {submitting && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Completing task...
        </div>
      )}
    </div>
  );
}
