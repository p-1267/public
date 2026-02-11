import React, { useState, useEffect, useRef } from 'react';
import { useTaskEngine } from '../hooks/useTaskEngine';
import { voiceService } from '../services/voiceService';
import { translatorService } from '../services/translatorService';
import { TranslationConfirmationModal } from './TranslationConfirmationModal';
import { EvidenceQualityResult } from './EvidenceQualityResult';

interface EvidenceCaptureProps {
  task: {
    id: string;
    task_name: string;
    resident_id: string;
    requires_evidence: boolean;
    resident?: { full_name: string };
  };
  mode: 'complete' | 'problem';
  onComplete: (evidenceData: any) => void;
  onCancel: () => void;
}

type EvidenceType = 'voice' | 'photo' | 'note' | 'metric';

export function EvidenceCapture({ task, mode, onComplete, onCancel }: EvidenceCaptureProps) {
  const { submitEvidence, loading } = useTaskEngine();
  const [activeType, setActiveType] = useState<EvidenceType | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [note, setNote] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showTranslationConfirm, setShowTranslationConfirm] = useState(false);
  const [translationResult, setTranslationResult] = useState<any>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [pendingEvidenceData, setPendingEvidenceData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'complete' && task.requires_evidence) {
      setActiveType('voice');
    }
  }, [mode, task.requires_evidence]);

  const handleVoiceStart = async () => {
    if (!voiceService.isAvailable()) {
      alert('Voice recognition not supported in this browser');
      return;
    }

    setIsRecording(true);
    setTranscript('');

    try {
      await voiceService.startListening(
        (result) => {
          setTranscript(result.transcript);
          if (result.isFinal) {
            setIsRecording(false);
          }
        },
        (error) => {
          console.error('Voice error:', error);
          setIsRecording(false);
        }
      );
    } catch (err) {
      console.error('Failed to start voice:', err);
      setIsRecording(false);
    }
  };

  const handleVoiceStop = async () => {
    voiceService.stopListening();
    setIsRecording(false);

    if (transcript.trim() && translatorService.isAvailable()) {
      setIsTranslating(true);
      try {
        const result = await translatorService.structureObservation(transcript);
        setTranslationResult(result);
        setShowTranslationConfirm(true);
      } catch (err) {
        console.error('Translation failed:', err);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTranslationConfirm = async () => {
    if (!translationResult) return;

    setTranscript(translationResult.translatedText);
    setShowTranslationConfirm(false);

    await submitEvidence(task.id, 'voice', {
      transcription: translationResult.translatedText,
      original_text: translationResult.originalText,
      original_language: translationResult.originalLanguage,
      translation_confidence: translationResult.confidence,
      structured_data: translationResult.structuredData
    });
  };

  const handleTranslationReject = () => {
    setShowTranslationConfirm(false);
    setTranscript('');
    setTranslationResult(null);
  };

  const handleTranslationEdit = (editedText: string) => {
    if (translationResult) {
      setTranslationResult({
        ...translationResult,
        translatedText: editedText
      });
    }
  };

  const handleSubmit = async () => {
    let evidenceData: any = {};

    if (activeType === 'voice' && transcript) {
      await submitEvidence(task.id, 'voice', { transcription: transcript });
      evidenceData = { type: 'voice', transcript };
    } else if (activeType === 'note' && note) {
      await submitEvidence(task.id, 'note', { notes: note });
      evidenceData = { type: 'note', note };
    } else if (activeType === 'metric' && metricValue) {
      await submitEvidence(task.id, 'metric', {
        metric_name: 'Value',
        metric_value: parseFloat(metricValue),
        metric_unit: metricUnit
      });
      evidenceData = { type: 'metric', value: metricValue, unit: metricUnit };
    } else if (activeType === 'photo' && photoPreview) {
      await submitEvidence(task.id, 'photo', { file_url: photoPreview });
      evidenceData = { type: 'photo', url: photoPreview };
    }

    if (mode === 'problem') {
      evidenceData.reason = note || transcript || 'Problem reported';
    }

    const quality = calculateQualityScore(evidenceData);
    setQualityScore(quality);
    setPendingEvidenceData(evidenceData);
  };

  const calculateQualityScore = (evidenceData: any): any => {
    let completeness = 0;
    let clarity = 0;
    let timeliness = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (evidenceData.type === 'voice' && evidenceData.transcript) {
      const wordCount = evidenceData.transcript.split(' ').length;
      completeness = Math.min(100, (wordCount / 10) * 100);
      clarity = wordCount >= 5 ? 90 : 60;

      if (wordCount < 5) {
        issues.push('Voice note is very brief');
        recommendations.push('Provide more detailed description');
      }
    } else if (evidenceData.type === 'note' && evidenceData.note) {
      const wordCount = evidenceData.note.split(' ').length;
      completeness = Math.min(100, (wordCount / 15) * 100);
      clarity = wordCount >= 10 ? 95 : 70;

      if (wordCount < 10) {
        issues.push('Written note lacks detail');
        recommendations.push('Include observations and context');
      }
    } else if (evidenceData.type === 'photo') {
      completeness = 100;
      clarity = 90;
      recommendations.push('Photo evidence captured');
    } else if (evidenceData.type === 'metric') {
      completeness = 100;
      clarity = 100;
      recommendations.push('Metric recorded successfully');
    } else {
      completeness = 0;
      clarity = 0;
      issues.push('No evidence content provided');
    }

    const score = Math.round((completeness + clarity + timeliness) / 3);

    return {
      score,
      completeness,
      clarity,
      timeliness,
      issues,
      recommendations
    };
  };

  const handleQualityClose = () => {
    if (pendingEvidenceData) {
      onComplete(pendingEvidenceData);
    }
    setQualityScore(null);
    setPendingEvidenceData(null);
  };

  const canSubmit = () => {
    if (mode === 'problem') {
      return note.trim().length > 0 || transcript.trim().length > 0;
    }

    if (!task.requires_evidence) return true;

    switch (activeType) {
      case 'voice': return transcript.trim().length > 0;
      case 'note': return note.trim().length > 0;
      case 'metric': return metricValue.trim().length > 0;
      case 'photo': return photoPreview !== null;
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-light text-gray-900 mb-2">
              {mode === 'complete' ? 'Complete Task' : 'Report Problem'}
            </h2>
            <p className="text-xl text-gray-600 font-light">{task.task_name}</p>
            {task.resident && (
              <p className="text-lg text-gray-500 mt-1">{task.resident.full_name}</p>
            )}
          </div>

          {mode === 'problem' ? (
            <div className="space-y-6">
              <div>
                <button
                  onClick={isRecording ? handleVoiceStop : handleVoiceStart}
                  className={`w-full p-8 rounded-2xl text-white text-xl font-medium transition-all ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isRecording ? '🎤 Recording... (tap to stop)' : '🎤 Speak to report issue'}
                </button>
                {transcript && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
                    <p className="text-gray-700">{transcript}</p>
                  </div>
                )}
              </div>

              <div className="text-center text-gray-400 text-sm">or</div>

              <div>
                <label className="block text-gray-700 mb-2 text-lg">Type issue</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe the problem..."
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-lg resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {task.requires_evidence && (
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <button
                    onClick={() => setActiveType('voice')}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      activeType === 'voice'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎤</div>
                    <div className="text-sm">Voice</div>
                  </button>
                  <button
                    onClick={() => setActiveType('photo')}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      activeType === 'photo'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">📷</div>
                    <div className="text-sm">Photo</div>
                  </button>
                  <button
                    onClick={() => setActiveType('note')}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      activeType === 'note'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">📝</div>
                    <div className="text-sm">Note</div>
                  </button>
                  <button
                    onClick={() => setActiveType('metric')}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      activeType === 'metric'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-sm">Metric</div>
                  </button>
                </div>
              )}

              {activeType === 'voice' && (
                <div>
                  <button
                    onClick={isRecording ? handleVoiceStop : handleVoiceStart}
                    className={`w-full p-8 rounded-2xl text-white text-xl font-medium transition-all ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {isRecording ? '🎤 Recording... (tap to stop)' : '🎤 Tap to speak'}
                  </button>
                  {transcript && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
                      <p className="text-gray-700">{transcript}</p>
                    </div>
                  )}
                </div>
              )}

              {activeType === 'photo' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white text-xl font-medium transition-all"
                  >
                    📷 Take Photo
                  </button>
                  {photoPreview && (
                    <div className="mt-4">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full rounded-2xl"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeType === 'note' && (
                <div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add your notes..."
                    rows={6}
                    className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-lg resize-none"
                  />
                </div>
              )}

              {activeType === 'metric' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2 text-lg">Value</label>
                    <input
                      type="number"
                      value={metricValue}
                      onChange={(e) => setMetricValue(e.target.value)}
                      placeholder="Enter value"
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2 text-lg">Unit</label>
                    <input
                      type="text"
                      value={metricUnit}
                      onChange={(e) => setMetricUnit(e.target.value)}
                      placeholder="e.g. mg, ml, %"
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={onCancel}
              className="p-4 rounded-2xl border-2 border-gray-300 text-gray-700 text-lg font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || loading}
              className="p-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white text-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>

      {showTranslationConfirm && translationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <h3 className="text-2xl font-light text-gray-900 mb-6">Confirm Translation</h3>

              {isTranslating && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔄</div>
                  <p className="text-lg text-gray-600">Translating and structuring...</p>
                </div>
              )}

              {!isTranslating && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Original ({translationResult.originalLanguage.toUpperCase()})
                      </div>
                      <div className="text-gray-900">{translationResult.originalText}</div>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-500">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        Translated (EN) - {(translationResult.confidence * 100).toFixed(0)}% confident
                      </div>
                      <div className="text-gray-900">{translationResult.translatedText}</div>
                    </div>
                  </div>

                  {translationResult.structuredData && (
                    <div className="bg-green-50 rounded-2xl p-4 border-2 border-green-500 mb-6">
                      <div className="text-sm font-medium text-green-900 mb-3">Extracted Information</div>

                      {translationResult.structuredData.concerns && translationResult.structuredData.concerns.length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-red-700 mb-1">Concerns:</div>
                          {translationResult.structuredData.concerns.map((c: string, i: number) => (
                            <div key={i} className="text-sm text-red-800 bg-red-50 p-2 rounded mb-1">{c}</div>
                          ))}
                        </div>
                      )}

                      {translationResult.structuredData.vitalSigns && Object.keys(translationResult.structuredData.vitalSigns).length > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-blue-700 mb-1">Vital Signs:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(translationResult.structuredData.vitalSigns).map(([key, value]) => (
                              <span key={key} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                                {key}: {value as string}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {translationResult.structuredData.observations && translationResult.structuredData.observations.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Observations:</div>
                          {translationResult.structuredData.observations.slice(0, 3).map((obs: string, i: number) => (
                            <div key={i} className="text-sm text-gray-700">• {obs}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <button
                      onClick={handleTranslationReject}
                      className="flex-1 p-4 rounded-2xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                    >
                      Reject & Re-record
                    </button>
                    <button
                      onClick={handleTranslationConfirm}
                      className="flex-1 p-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-medium transition-all"
                    >
                      ✓ Confirm & Save
                    </button>
                  </div>

                  <div className="mt-4 text-center text-sm text-gray-500">
                    Confirmation will be logged for audit trail
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {qualityScore && (
        <EvidenceQualityResult
          quality={qualityScore}
          onClose={handleQualityClose}
        />
      )}
    </div>
  );
}
