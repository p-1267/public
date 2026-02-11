import React from 'react';

interface VoiceDocumentationViewerProps {
  documentation: {
    id: string;
    originalText: string;
    originalLanguage: string;
    translatedText: string;
    targetLanguage: string;
    caregiverConfirmedAt: string;
    caregiverName?: string;
    createdAt?: string;
    residentName?: string;
  };
  showResidentInfo?: boolean;
}

const LANGUAGE_NAMES: Record<string, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Español' },
  zh: { name: 'Chinese', nativeName: '中文' },
  tl: { name: 'Tagalog', nativeName: 'Tagalog' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  ko: { name: 'Korean', nativeName: '한국어' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  fr: { name: 'French', nativeName: 'Français' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  ru: { name: 'Russian', nativeName: 'Русский' },
  ar: { name: 'Arabic', nativeName: 'العربية' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
};

export const VoiceDocumentationViewer: React.FC<VoiceDocumentationViewerProps> = ({
  documentation,
  showResidentInfo = false,
}) => {
  const originalLang = LANGUAGE_NAMES[documentation.originalLanguage] || {
    name: 'Unknown',
    nativeName: documentation.originalLanguage,
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div>
          {showResidentInfo && documentation.residentName && (
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#0f172a',
              marginBottom: '4px',
            }}>
              {documentation.residentName}
            </div>
          )}
          <div style={{
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '4px',
          }}>
            <strong>Documented by:</strong> {documentation.caregiverName || 'Caregiver'}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#64748b',
          }}>
            <strong>Date:</strong> {documentation.createdAt ? new Date(documentation.createdAt).toLocaleString() : 'N/A'}
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          alignItems: 'flex-end',
        }}>
          <div style={{
            padding: '4px 12px',
            background: '#dcfce7',
            color: '#065f46',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            ✓ HUMAN VERIFIED
          </div>
          <div style={{
            padding: '4px 12px',
            background: '#eff6ff',
            color: '#1e40af',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            🌐 MULTILINGUAL
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#0f172a',
          }}>
            Original Language (Caregiver Verified)
          </div>
          <div style={{
            padding: '3px 10px',
            background: '#fef3c7',
            color: '#92400e',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {originalLang.nativeName} ({originalLang.name})
          </div>
        </div>
        <div style={{
          padding: '16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#0f172a',
          lineHeight: '1.7',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {documentation.originalText}
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#64748b',
          fontStyle: 'italic',
        }}>
          ✓ Confirmed accurate by caregiver at {new Date(documentation.caregiverConfirmedAt).toLocaleString()}
        </div>
      </div>

      {documentation.originalLanguage !== 'en' && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#0f172a',
            }}>
              Translated Report (System Generated After Confirmation)
            </div>
            <div style={{
              padding: '3px 10px',
              background: '#dbeafe',
              color: '#1e40af',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              English
            </div>
          </div>
          <div style={{
            padding: '16px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#0f172a',
            lineHeight: '1.7',
          }}>
            {documentation.translatedText}
          </div>
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#64748b',
            fontStyle: 'italic',
          }}>
            🤖 Automated translation performed only after caregiver confirmation of original text
          </div>
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#1e40af',
        lineHeight: '1.5',
      }}>
        <strong>Audit Trail:</strong> This documentation was verified by a human caregiver before any AI translation. Both original and translated versions are preserved in the permanent care record.
      </div>
    </div>
  );
};
