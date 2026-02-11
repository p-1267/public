import React, { useState } from 'react';

interface Translation {
  original: string;
  originalLanguage: string;
  translated: string;
  targetLanguage: string;
  confidence: number;
}

interface ParsedIntent {
  action: string;
  resident?: string;
  task?: string;
  details?: string;
  suggestedFields?: Array<{ field: string; value: string; missing?: boolean }>;
}

interface VoiceConfirmationFlowProps {
  onConfirm: (data: any) => void;
  onReject: () => void;
  onRetry: () => void;
}

export const VoiceConfirmationFlow: React.FC<VoiceConfirmationFlowProps> = ({
  onConfirm,
  onReject,
  onRetry
}) => {
  const [stage, setStage] = useState<'recording' | 'processing' | 'confirm'>('recording');
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);

  const simulateRecording = () => {
    setStage('processing');
    setTimeout(() => {
      setTranslation({
        original: "Maria necesita su medicina de presión ahora, y también necesitamos documentar su temperatura",
        originalLanguage: "Spanish",
        translated: "Maria needs her blood pressure medication now, and we also need to document her temperature",
        targetLanguage: "English",
        confidence: 0.95
      });
      setIntent({
        action: "medication_administration",
        resident: "Maria Rodriguez",
        task: "Blood pressure medication (Lisinopril 10mg)",
        details: "Also noted: temperature documentation needed",
        suggestedFields: [
          { field: "Time", value: "2:45 PM" },
          { field: "Administered by", value: "Current user" },
          { field: "Follow-up", value: "Record temperature", missing: true }
        ]
      });
      setStage('confirm');
    }, 1500);
  };

  if (stage === 'recording') {
    return (
      <div className="bg-white border-2 border-blue-400 rounded-xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4 animate-pulse">🎤</div>
        <h3 className="text-xl font-bold mb-2">Listening...</h3>
        <p className="text-gray-600 mb-6">Speak naturally in your language</p>
        <button
          onClick={simulateRecording}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
        >
          Stop Recording
        </button>
      </div>
    );
  }

  if (stage === 'processing') {
    return (
      <div className="bg-white border-2 border-blue-400 rounded-xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h3 className="text-xl font-bold mb-2">Processing...</h3>
        <p className="text-gray-600">Transcribing and translating</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-400 rounded-xl shadow-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🗣️</span>
          Confirm Voice Entry
        </h3>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="text-xs text-gray-600 mb-1 font-semibold">Original ({translation?.originalLanguage}):</div>
          <div className="text-sm text-gray-800 mb-3 italic">"{translation?.original}"</div>

          <div className="text-xs text-gray-600 mb-1 font-semibold">Translation ({translation?.targetLanguage}):</div>
          <div className="text-sm text-gray-900">"{translation?.translated}"</div>

          <div className="mt-2 text-xs text-gray-500">
            Confidence: {((translation?.confidence || 0) * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="font-semibold text-blue-900 mb-3">System Understanding:</div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Action:</span> {intent?.action?.replace(/_/g, ' ')}
            </div>
            <div>
              <span className="font-semibold">Resident:</span> {intent?.resident}
            </div>
            <div>
              <span className="font-semibold">Task:</span> {intent?.task}
            </div>
            {intent?.details && (
              <div className="text-gray-700 italic mt-2">
                Note: {intent.details}
              </div>
            )}
          </div>

          {intent?.suggestedFields && intent.suggestedFields.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-300">
              <div className="font-semibold text-blue-900 mb-2">Suggested Fields:</div>
              <div className="space-y-2">
                {intent.suggestedFields.map((field, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{field.field}:</span>
                    <span className={field.missing ? 'text-orange-600' : 'text-gray-900'}>
                      {field.value} {field.missing && '(needs input)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-4 text-sm text-yellow-900">
        ⚠️ Please verify translation accuracy before confirming
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onRetry}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold"
        >
          Re-record
        </button>
        <button
          onClick={onReject}
          className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold"
        >
          Incorrect
        </button>
        <button
          onClick={() => onConfirm({ translation, intent })}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
        >
          ✓ Confirm
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        Your confirmation will be logged with timestamp
      </div>
    </div>
  );
};
