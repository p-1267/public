import React, { useState } from 'react';

interface VoiceDocumentationWorkflowProps {
  onComplete?: (data: {
    originalText: string;
    originalLanguage: string;
    translatedText: string;
    targetLanguage: string;
    caregiverConfirmedAt: string;
  }) => void;
  onCancel?: () => void;
  fieldLabel?: string;
  requireTranslation?: boolean;
}

type WorkflowStep = 'record' | 'review' | 'translate' | 'final' | 'complete';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'tl', name: 'Tagalog', nativeName: 'Tagalog' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

const SIMULATED_TRANSLATIONS: Record<string, Record<string, string>> = {
  'es': {
    'en': 'The patient has eaten well today and seems in good spirits. No complaints of pain. Vital signs are normal.',
    'original': 'El paciente ha comido bien hoy y parece estar de buen ánimo. No hay quejas de dolor. Los signos vitales son normales.'
  },
  'zh': {
    'en': 'The patient completed morning exercises and took all medications on schedule. Blood pressure is stable.',
    'original': '患者完成了早晨锻炼并按时服用了所有药物。血压稳定。'
  },
  'tl': {
    'en': 'The patient had a restful night and woke up feeling refreshed. Breakfast was completed without assistance.',
    'original': 'Ang pasyente ay may mapayapang gabi at nagising na pakiramdam ay sariwa. Natapos ang almusal nang walang tulong.'
  },
  'vi': {
    'en': 'The patient participated in group activities and showed improved mood. No adverse reactions to medications.',
    'original': 'Bệnh nhân tham gia các hoạt động nhóm và cho thấy tâm trạng được cải thiện. Không có phản ứng bất lợi đối với thuốc.'
  },
};

export const VoiceDocumentationWorkflow: React.FC<VoiceDocumentationWorkflowProps> = ({
  onComplete,
  onCancel,
  fieldLabel = 'Care Documentation',
  requireTranslation = true,
}) => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');
  const [originalText, setOriginalText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [confirmationTimestamp, setConfirmationTimestamp] = useState<string>('');

  const handleStartRecording = () => {
    setIsRecording(true);

    setTimeout(() => {
      setIsRecording(false);
      setCurrentStep('review');
    }, 3000);
  };

  const handleSelectLanguage = (langCode: string) => {
    setDetectedLanguage(langCode);
    const simulatedData = SIMULATED_TRANSLATIONS[langCode];
    if (simulatedData) {
      setOriginalText(simulatedData.original);
    } else {
      setOriginalText(`This is simulated speech-to-text output for ${fieldLabel}. In production, this would use a multilingual speech recognition API.`);
    }
  };

  const handleConfirmOriginal = () => {
    const timestamp = new Date().toISOString();
    setConfirmationTimestamp(timestamp);

    if (requireTranslation && detectedLanguage !== 'en') {
      setCurrentStep('translate');
      setIsTranslating(true);

      setTimeout(() => {
        const simulatedData = SIMULATED_TRANSLATIONS[detectedLanguage];
        if (simulatedData) {
          setTranslatedText(simulatedData.en);
        } else {
          setTranslatedText(`[TRANSLATED FROM ${SUPPORTED_LANGUAGES.find(l => l.code === detectedLanguage)?.nativeName}]\n\n${originalText}\n\n(In production, this would use a professional translation API after caregiver confirmation)`);
        }
        setIsTranslating(false);
        setCurrentStep('final');
      }, 2000);
    } else {
      setCurrentStep('complete');
      if (onComplete) {
        onComplete({
          originalText,
          originalLanguage: detectedLanguage,
          translatedText: originalText,
          targetLanguage: 'en',
          caregiverConfirmedAt: timestamp,
        });
      }
    }
  };

  const handleSaveFinal = () => {
    setCurrentStep('complete');
    if (onComplete) {
      onComplete({
        originalText,
        originalLanguage: detectedLanguage,
        translatedText: translatedText || originalText,
        targetLanguage: 'en',
        caregiverConfirmedAt: confirmationTimestamp,
      });
    }
  };

  const handleEditOriginal = () => {
    setCurrentStep('review');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'record':
        return (
          <div>
            <div style={{
              background: '#eff6ff',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#1e40af',
              }}>
                Step 1: Record in Your Language
              </h3>
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#1e3a8a',
                lineHeight: '1.6',
              }}>
                Speak naturally in ANY language. The system will transcribe your words EXACTLY as spoken. You will review and confirm before any translation occurs.
              </p>

              {!isRecording && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#0f172a',
                  }}>
                    Select the language you will speak:
                  </label>
                  <select
                    value={detectedLanguage}
                    onChange={(e) => handleSelectLanguage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="">Choose language...</option>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleStartRecording}
                disabled={isRecording || !detectedLanguage}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: isRecording ? '#9ca3af' : !detectedLanguage ? '#cbd5e1' : '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isRecording || !detectedLanguage ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '24px' }}>{isRecording ? '🎙️' : '🎤'}</span>
                <span>{isRecording ? 'Recording... Speak now' : 'Start Recording'}</span>
              </button>

              {isRecording && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#991b1b',
                  textAlign: 'center',
                  fontWeight: 600,
                }}>
                  🎙️ RECORDING IN PROGRESS — Speak clearly
                </div>
              )}
            </div>
          </div>
        );

      case 'review':
        return (
          <div>
            <div style={{
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#92400e',
              }}>
                Step 2: Review Original Text (REQUIRED)
              </h3>
              <p style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#78350f',
                lineHeight: '1.5',
              }}>
                <strong>Language Detected:</strong> {SUPPORTED_LANGUAGES.find(l => l.code === detectedLanguage)?.nativeName} ({SUPPORTED_LANGUAGES.find(l => l.code === detectedLanguage)?.name})
              </p>
              <p style={{
                margin: '0',
                fontSize: '13px',
                color: '#78350f',
                fontStyle: 'italic',
              }}>
                Review the text below. You MUST confirm it is accurate before the system can translate it.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
              }}>
                Original Language (Caregiver Verified) — {SUPPORTED_LANGUAGES.find(l => l.code === detectedLanguage)?.nativeName}
              </label>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontFamily: 'monospace',
                  lineHeight: '1.6',
                  resize: 'vertical',
                }}
                placeholder="Edit the transcription if needed..."
              />
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#64748b',
              }}>
                You can edit the text above to correct any transcription errors.
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={() => setCurrentStep('record')}
                style={{
                  flex: '1',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#64748b',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ← Re-record
              </button>
              <button
                onClick={handleConfirmOriginal}
                disabled={!originalText.trim()}
                style={{
                  flex: '2',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: !originalText.trim() ? '#cbd5e1' : '#10b981',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: !originalText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                ✓ Confirm Original Text (Human Verification)
              </button>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#fef2f2',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#991b1b',
            }}>
              <strong>CRITICAL:</strong> By clicking "Confirm," you certify this text is accurate. Translation will only occur AFTER your confirmation.
            </div>
          </div>
        );

      case 'translate':
        return (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}>
              🌐
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: 600,
              color: '#0f172a',
            }}>
              Translating to English...
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#64748b',
            }}>
              Professional translation in progress (Post-Confirmation)
            </p>
          </div>
        );

      case 'final':
        return (
          <div>
            <div style={{
              background: '#dcfce7',
              border: '2px solid #10b981',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#065f46',
              }}>
                Step 3: Review Translated Report
              </h3>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: '#047857',
              }}>
                Review the English translation before saving to the official record.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
              }}>
                Original Language (Caregiver Verified) — {SUPPORTED_LANGUAGES.find(l => l.code === detectedLanguage)?.nativeName}
              </label>
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#475569',
                fontFamily: 'monospace',
                lineHeight: '1.6',
                marginBottom: '16px',
              }}>
                {originalText}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                marginBottom: '16px',
              }}>
                ✓ Confirmed by caregiver at {new Date(confirmationTimestamp).toLocaleString()}
              </div>

              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
              }}>
                Translated Report (System Generated After Confirmation) — English
              </label>
              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  lineHeight: '1.6',
                  resize: 'vertical',
                }}
              />
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#64748b',
              }}>
                You can edit the translation if needed before saving.
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={handleEditOriginal}
                style={{
                  flex: '1',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#64748b',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                ← Edit Original
              </button>
              <button
                onClick={handleSaveFinal}
                disabled={!translatedText.trim()}
                style={{
                  flex: '2',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: !translatedText.trim() ? '#cbd5e1' : '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: !translatedText.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                💾 Save to Official Record
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '16px',
            }}>
              ✅
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '22px',
              fontWeight: 600,
              color: '#10b981',
            }}>
              Voice Documentation Saved Successfully
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#64748b',
            }}>
              Both original and translated versions have been stored in the care record.
            </p>
            <div style={{
              background: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '13px',
              color: '#1e40af',
              textAlign: 'left',
              lineHeight: '1.6',
            }}>
              <strong>Saved:</strong><br />
              • Original ({SUPPORTED_LANGUAGES.find(l => l.code === detectedLanguage)?.name}): Caregiver-verified<br />
              • Translation (English): System-generated post-confirmation<br />
              • Audit trail: Complete with timestamps
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
      }}>
        <div style={{
          marginBottom: '8px',
          padding: '8px 12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#92400e',
          textAlign: 'center',
        }}>
          SHOWCASE MODE — Multilingual Voice Documentation (Human-Verified Workflow)
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h1 style={{
            margin: '0 0 12px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a',
          }}>
            Voice Documentation — {fieldLabel}
          </h1>
          <p style={{
            margin: '0 0 24px 0',
            fontSize: '15px',
            color: '#64748b',
            lineHeight: '1.6',
          }}>
            Record care notes in ANY language. You will review and confirm before translation.
          </p>

          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
          }}>
            {['record', 'review', 'translate', 'final'].map((step, idx) => (
              <div
                key={step}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor:
                    ['record', 'review', 'translate', 'final', 'complete'].indexOf(currentStep) > idx
                      ? '#10b981'
                      : ['record', 'review', 'translate', 'final', 'complete'].indexOf(currentStep) === idx
                      ? '#3b82f6'
                      : '#e2e8f0',
                }}
              />
            ))}
          </div>

          {renderStep()}
        </div>

        {currentStep !== 'complete' && onCancel && (
          <button
            onClick={onCancel}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#64748b',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
