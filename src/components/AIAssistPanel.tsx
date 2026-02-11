import React, { useState } from 'react';
import { mockAI, AIContext, AIRequest, AIResponse } from '../services/mockAIEngine';

interface AIAssistPanelProps {
  context: AIContext;
  onClose: () => void;
  aiEnabled?: boolean;
}

type AIMode = 'DRAFT' | 'SUMMARIZE' | 'EXPLAIN' | 'CHECKLIST' | 'ASK';

export const AIAssistPanel: React.FC<AIAssistPanelProps> = ({
  context,
  onClose,
  aiEnabled = true,
}) => {
  const [mode, setMode] = useState<AIMode>('ASK');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setResponse(null);

    const request: AIRequest = {
      mode,
      context,
      prompt,
    };

    try {
      const result = await mockAI.generateResponse(request);
      setResponse(result);
    } catch (error) {
      setResponse({
        text: 'Error generating response. Please try again.',
        requiresReview: true,
        disclaimer: 'Error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response.text);
      alert('✓ AI response copied to clipboard\n\n(Showcase Mode: Ready to paste into your form)');
    }
  };

  if (!aiEnabled) {
    return (
      <div
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: '400px',
          maxHeight: '600px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          border: '2px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            AI Assist
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              fontSize: '18px',
              color: '#64748b',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
              AI Provider Not Connected
            </div>
            <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
              AI assistance requires an active OpenAI or Gemini credential.
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Only Agency Administrators can configure AI providers.
          </div>

          {context.role === 'AGENCY_ADMIN' && (
            <button
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              onClick={() => alert('Navigate to: Agency Settings > Credentials > AI Provider\n\n(Showcase Mode: This would open the credential management panel)')}
            >
              Configure AI Provider
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        width: '450px',
        maxHeight: '700px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        border: '2px solid #3b82f6',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#eff6ff',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            AI Assist
          </h3>
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>
            SHADOW AI - Suggestion Only
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '4px 8px',
            fontSize: '18px',
            color: '#64748b',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fef3c7' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
          SHOWCASE MODE - Mock AI Engine
        </div>
        <div style={{ fontSize: '10px', color: '#78350f' }}>
          Context: {context.role}{context.residentName ? ` • ${context.residentName}` : ''}{context.currentPage ? ` • ${context.currentPage}` : ''}
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        {['ASK', 'SUMMARIZE', 'EXPLAIN', 'CHECKLIST', 'DRAFT'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m as AIMode)}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: mode === m ? '#ffffff' : '#64748b',
              backgroundColor: mode === m ? '#3b82f6' : '#f8fafc',
              border: `1px solid ${mode === m ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {!response && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              {mode === 'ASK' && 'Ask a question:'}
              {mode === 'SUMMARIZE' && 'What would you like summarized?'}
              {mode === 'EXPLAIN' && 'What needs explanation?'}
              {mode === 'CHECKLIST' && 'Generate checklist for:'}
              {mode === 'DRAFT' && 'Describe what you want to draft:'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'ASK' ? 'Example: How do I handle a medication refusal?' :
                mode === 'SUMMARIZE' ? 'Example: Summarize today\'s activities' :
                mode === 'EXPLAIN' ? 'Example: Explain the fall alert I just received' :
                mode === 'CHECKLIST' ? 'Example: Care log documentation' :
                'Example: Draft an incident report for a minor fall'
              }
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />

            <div style={{
              padding: '12px',
              backgroundColor: '#dbeafe',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#1e40af',
              marginTop: '12px',
            }}>
              <strong>Shadow AI Boundaries:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Can draft, summarize, explain, suggest</li>
                <li>CANNOT execute actions or submit forms</li>
                <li>Human review always required</li>
                <li>Not a medical/legal authority</li>
              </ul>
            </div>
          </div>
        )}

        {response && (
          <div>
            <div style={{
              padding: '16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                AI RESPONSE:
              </div>
              <div style={{ fontSize: '13px', color: '#0f172a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {response.text}
              </div>
            </div>

            {response.suggestions && response.suggestions.length > 0 && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
                  SUGGESTIONS:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#78350f' }}>
                  {response.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {response.uncertainty && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                marginBottom: '12px',
                fontSize: '12px',
                color: '#991b1b',
              }}>
                ⚠️ <strong>Uncertainty:</strong> {response.uncertainty}
              </div>
            )}

            <div style={{
              padding: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#065f46',
              marginBottom: '12px',
            }}>
              {response.disclaimer}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                📋 Copy Response
              </button>
              <button
                onClick={() => {
                  setResponse(null);
                  setPrompt('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748b',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                New Query
              </button>
            </div>
          </div>
        )}
      </div>

      {!response && (
        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: loading || !prompt.trim() ? '#cbd5e1' : '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Generating...' : '✨ Generate AI Response'}
          </button>
        </div>
      )}
    </div>
  );
};
