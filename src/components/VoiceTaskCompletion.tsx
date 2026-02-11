import React, { useState } from 'react';
import { voicePipeline } from '../services/voicePipeline';
import { TelemetryTracker } from '../services/telemetryTracking';
import type { VoiceRecording, StructuredExtraction } from '../services/voicePipeline';

interface VoiceTaskCompletionProps {
  task: {
    id: string;
    title: string;
    category: string;
    residentName: string;
  };
  onComplete: (extraction: StructuredExtraction) => void;
  onCancel: () => void;
}

const telemetry = new TelemetryTracker();

export function VoiceTaskCompletion({
  task,
  onComplete,
  onCancel,
}: VoiceTaskCompletionProps) {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<StructuredExtraction | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedData, setCorrectedData] = useState<Record<string, any>>({});

  React.useEffect(() => {
    telemetry.startTracking(task.id);
  }, [task.id]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (recording) {
      interval = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording]);

  const handleStartRecording = async () => {
    try {
      telemetry.recordTap();
      await voicePipeline.startRecording();
      setRecording(true);
    } catch (error) {
      alert('Failed to start recording. Please check microphone permissions.');
      console.error(error);
    }
  };

  const handleStopRecording = async () => {
    try {
      setRecording(false);
      setProcessing(true);

      const recording: VoiceRecording = await voicePipeline.stopRecording();

      // Transcribe
      const transcriptionResult = await voicePipeline.transcribeAudio(recording);
      setTranscription(transcriptionResult.text);

      // Extract structured data based on task category
      const extractionType = mapCategoryToExtractionType(task.category);
      const extractionResult = await voicePipeline.extractStructuredData(
        transcriptionResult.id,
        transcriptionResult.text,
        extractionType
      );

      setExtraction(extractionResult);

      if (extractionResult.requiresCorrection) {
        setCorrectedData(extractionResult.data);
        setShowCorrection(true);
      } else {
        // Auto-approve if confidence is high
        await handleComplete(extractionResult);
      }
    } catch (error) {
      alert('Failed to process voice recording. Please try again.');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCorrection = async () => {
    if (!extraction) return;

    try {
      await voicePipeline.correctExtraction(extraction.id, correctedData);
      await handleComplete({ ...extraction, data: correctedData });
    } catch (error) {
      alert('Failed to save corrections.');
      console.error(error);
    }
  };

  const handleComplete = async (finalExtraction: StructuredExtraction) => {
    await telemetry.recordCompletion('voice', false, {
      voiceUsed: true,
      evidenceCount: 1,
    });
    onComplete(finalExtraction);
  };

  if (showCorrection && extraction) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">Review & Correct</h3>
          <p className="text-sm text-gray-600">{task.title} - {task.residentName}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Transcription:</p>
          <p className="text-sm text-blue-800 italic">"{transcription}"</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-yellow-900 mb-2">
            ⚠️ Confidence: {Math.round(extraction.confidence * 100)}% - Please review
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <p className="text-sm font-medium text-gray-700">Extracted data:</p>
          {Object.entries(correctedData).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {key.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                value={value || ''}
                onChange={(e) => {
                  setCorrectedData({ ...correctedData, [key]: e.target.value });
                  telemetry.recordTyping(e.target.value);
                }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCorrection}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Confirm & Complete
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
        <p className="font-medium text-gray-900">Processing voice recording...</p>
        <p className="text-sm text-gray-600 mt-2">
          Transcribing and extracting structured data
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
        <p className="text-sm text-gray-600">{task.residentName}</p>
      </div>

      <div className="text-center">
        {!recording ? (
          <button
            onClick={handleStartRecording}
            className="w-full py-8 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <span className="text-4xl">🎤</span>
              </div>
              <span className="text-lg font-bold">Start Recording</span>
              <span className="text-sm opacity-90">Tap to speak</span>
            </div>
          </button>
        ) : (
          <div className="space-y-6">
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-xl font-bold text-red-900">Recording</span>
              </div>
              <div className="text-3xl font-mono text-red-900">
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
              </div>
            </div>

            <button
              onClick={handleStopRecording}
              className="w-full py-4 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 transition-colors"
            >
              Stop & Process
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600">
          <strong>Tip:</strong> Speak clearly and include key details like medication
          name, dosage, vitals, or incident description.
        </p>
      </div>
    </div>
  );
}

function mapCategoryToExtractionType(category: string): StructuredExtraction['type'] {
  const mapping: Record<string, StructuredExtraction['type']> = {
    medication: 'medication',
    vitals: 'vital_signs',
    incident: 'incident_note',
    adl: 'adl',
    meal: 'meal',
  };
  return mapping[category] || 'incident_note';
}
