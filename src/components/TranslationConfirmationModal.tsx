/**
 * Translation Confirmation Modal
 *
 * Requires human confirmation of AI translations
 * Shows translation reasoning and ambiguities
 * Enforces "no silent rewriting" principle
 */

import React, { useState } from 'react';
import { IntelligentTranslationResult } from '../services/intelligenceOrchestrator';

interface TranslationConfirmationModalProps {
  translation: IntelligentTranslationResult;
  onConfirm: (confirmedBy: string) => void;
  onReject: () => void;
  onEdit: (editedText: string) => void;
}

export function TranslationConfirmationModal({
  translation,
  onConfirm,
  onReject,
  onEdit
}: TranslationConfirmationModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(translation.translatedText);
  const [confirmerName, setConfirmerName] = useState('');

  const handleConfirm = () => {
    if (!confirmerName.trim()) {
      alert('Please enter your name to confirm');
      return;
    }
    onConfirm(confirmerName);
  };

  const handleSaveEdit = () => {
    if (editedText.trim()) {
      onEdit(editedText);
      setIsEditing(false);
    }
  };

  const confidenceColor = translation.aiReasoning.confidenceScore >= 0.8
    ? 'text-green-700 bg-green-100'
    : translation.aiReasoning.confidenceScore >= 0.6
    ? 'text-yellow-700 bg-yellow-100'
    : 'text-red-700 bg-red-100';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
          <h2 className="text-2xl font-bold mb-2">Translation Confirmation Required</h2>
          <p className="text-blue-100 text-sm">AI has translated your voice note. Please review and confirm accuracy.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-5 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Original ({translation.originalLanguage.toUpperCase()})</h3>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  Your Words
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {translation.originalText}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-5 border-2 border-blue-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Translation ({translation.targetLanguage.toUpperCase()})</h3>
                <span className={`text-xs px-2 py-1 rounded font-medium ${confidenceColor}`}>
                  {Math.round(translation.aiReasoning.confidenceScore * 100)}% Confidence
                </span>
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full h-32 p-3 border-2 border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Edit translation..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Save Edit
                    </button>
                    <button
                      onClick={() => {
                        setEditedText(translation.translatedText);
                        setIsEditing(false);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded text-sm font-medium hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">
                    {editedText}
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    ✏️ Edit Translation
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-5">
            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🤖</span>
              AI Translation Reasoning
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">Method:</p>
                <p className="text-sm text-gray-700">
                  {translation.auditTrail.method === 'AI_CONTEXTUAL'
                    ? '🎯 AI Contextual Translation (Medical context preserved)'
                    : translation.auditTrail.method === 'LITERAL'
                    ? '📝 Literal Translation (Direct word-for-word)'
                    : '🔄 Hybrid Translation (Combination approach)'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">Rationale:</p>
                <p className="text-sm text-gray-700">{translation.aiReasoning.translationRationale}</p>
              </div>
              {translation.aiReasoning.medicalTermsPreserved.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-purple-900 mb-1">Medical Terms Preserved:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {translation.aiReasoning.medicalTermsPreserved.map((term, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-xs font-medium"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-purple-900 mb-1">Meaning Preserved:</p>
                <div className="flex items-center gap-2">
                  {translation.aiReasoning.meaningPreserved ? (
                    <>
                      <span className="text-green-600 text-xl">✓</span>
                      <span className="text-sm text-green-700">Yes, meaning is preserved</span>
                    </>
                  ) : (
                    <>
                      <span className="text-orange-600 text-xl">⚠</span>
                      <span className="text-sm text-orange-700">Review recommended - potential nuance loss</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {translation.aiReasoning.potentialAmbiguities.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-5">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                Potential Ambiguities Detected
              </h3>
              <ul className="space-y-2">
                {translation.aiReasoning.potentialAmbiguities.map((ambiguity, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-yellow-600 mt-0.5">▸</span>
                    <span>{ambiguity}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 p-3 bg-yellow-100 rounded text-sm text-yellow-900">
                <strong>Action Required:</strong> Please carefully verify the translation matches your intended meaning before confirming.
              </div>
            </div>
          )}

          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
            <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <span className="text-lg">🚨</span>
              Critical: Confirmation Required
            </h3>
            <p className="text-sm text-gray-700 mb-4">{translation.confirmationPrompt}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  I confirm this translation is accurate:
                </label>
                <input
                  type="text"
                  value={confirmerName}
                  onChange={(e) => setConfirmerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• By confirming, you attest that the translation accurately reflects what you said</p>
                <p>• Your confirmation will be logged in the audit trail</p>
                <p>• You are legally accountable for the accuracy of submitted documentation</p>
                <p>• The original text and translation will both be stored for compliance</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-b-xl flex items-center justify-between border-t border-gray-200">
          <button
            onClick={onReject}
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
          >
            Reject & Re-record
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmerName.trim() || isEditing}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>✓</span>
            Confirm & Submit
          </button>
        </div>

        <div className="px-6 py-3 bg-blue-600 text-white text-xs text-center">
          <p><strong>Phase 4 Intelligence:</strong> No silent rewriting. All translations are transparent and require human confirmation.</p>
        </div>
      </div>
    </div>
  );
}
