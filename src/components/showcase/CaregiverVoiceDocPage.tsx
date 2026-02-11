import React, { useState } from 'react';
import { VoiceDocumentationWorkflow } from '../VoiceDocumentationWorkflow';

export const CaregiverVoiceDocPage: React.FC = () => {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [savedDocs, setSavedDocs] = useState<any[]>([]);

  const handleCompleteDocumentation = (data: any) => {
    const newDoc = {
      id: `voice-doc-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      caregiverName: 'Caregiver',
    };

    setSavedDocs(prev => [newDoc, ...prev]);
    setShowWorkflow(false);

    alert('✅ Voice Documentation Saved\n\nBoth original and translated versions have been stored.\n\n(Showcase: In production, this would be saved to the database with full audit trail)');
  };

  if (showWorkflow) {
    return (
      <VoiceDocumentationWorkflow
        fieldLabel="Care Note"
        onComplete={handleCompleteDocumentation}
        onCancel={() => setShowWorkflow(false)}
        requireTranslation={true}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{
          marginBottom: '24px',
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 600,
            color: '#0f172a',
          }}>
            Voice Documentation
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
          }}>
            Record care notes in your preferred language. All documentation is verified before translation.
          </p>
        </div>

        <div style={{
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h2 style={{
            margin: '0 0 12px 0',
            fontSize: '20px',
            fontWeight: 600,
            color: '#1e40af',
          }}>
            How Voice Documentation Works
          </h2>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'start',
            }}>
              <div style={{
                minWidth: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '14px',
              }}>
                1
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                  Record in ANY Language
                </div>
                <div style={{ fontSize: '14px', color: '#1e3a8a' }}>
                  Speak naturally in your preferred language. No need to translate yourself.
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'start',
            }}>
              <div style={{
                minWidth: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f59e0b',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '14px',
              }}>
                2
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                  Review & Confirm (REQUIRED)
                </div>
                <div style={{ fontSize: '14px', color: '#1e3a8a' }}>
                  You MUST verify the transcription is accurate before any translation occurs.
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'start',
            }}>
              <div style={{
                minWidth: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#10b981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '14px',
              }}>
                3
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                  Automatic Translation (Post-Confirmation)
                </div>
                <div style={{ fontSize: '14px', color: '#1e3a8a' }}>
                  Only after your confirmation, the system translates to English for supervisors and records.
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowWorkflow(true)}
          style={{
            width: '100%',
            padding: '20px',
            fontSize: '18px',
            fontWeight: 600,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <span style={{ fontSize: '32px' }}>🎤</span>
          <span>Start New Voice Documentation</span>
        </button>

        {savedDocs.length > 0 && (
          <div>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: 600,
              color: '#0f172a',
            }}>
              Recent Voice Documentation
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedDocs.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '12px',
                  }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: '#0f172a' }}>
                        {doc.caregiverName}
                      </div>
                      <div style={{ fontSize: '14px', color: '#64748b' }}>
                        {new Date(doc.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      background: '#dcfce7',
                      color: '#065f46',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      ✓ VERIFIED
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748b',
                      marginBottom: '6px',
                    }}>
                      Original Language (Caregiver Verified):
                    </div>
                    <div style={{
                      padding: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#475569',
                      fontFamily: 'monospace',
                      lineHeight: '1.5',
                    }}>
                      {doc.originalText}
                    </div>
                  </div>

                  {doc.originalLanguage !== 'en' && (
                    <div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '6px',
                      }}>
                        Translated Report (System Generated After Confirmation):
                      </div>
                      <div style={{
                        padding: '12px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#0f172a',
                        lineHeight: '1.5',
                      }}>
                        {doc.translatedText}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {savedDocs.length === 0 && (
          <div style={{
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <div style={{ fontSize: '16px', color: '#64748b' }}>
              No voice documentation yet. Click above to start recording.
            </div>
          </div>
        )}

        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400e',
          lineHeight: '1.6',
        }}>
          <strong>🌐 Multilingual Support:</strong> This feature supports 12+ languages including Spanish, Chinese, Tagalog, Vietnamese, Korean, Japanese, French, Portuguese, Russian, Arabic, and Hindi. All documentation is verified by the caregiver before translation.
        </div>
      </div>
    </div>
  );
};
