import React, { useState } from 'react';

interface VoiceInputButtonProps {
  onTranscript?: (text: string) => void;
  fieldLabel: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onTranscript, fieldLabel }) => {
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    setIsListening(true);

    setTimeout(() => {
      setIsListening(false);
      const simulatedTranscript = `This is a simulated voice transcript for ${fieldLabel}. In production, this would use the Web Speech API to capture real voice input.`;

      if (onTranscript) {
        onTranscript(simulatedTranscript);
      }

      alert(`🎤 Voice Input (Simulated)\n\nTranscript: "${simulatedTranscript}"\n\n(Showcase Mode: Real STT requires Web Speech API)`);
    }, 2000);
  };

  return (
    <button
      onClick={handleVoiceInput}
      disabled={isListening}
      style={{
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 600,
        color: isListening ? '#ffffff' : '#0f172a',
        backgroundColor: isListening ? '#3b82f6' : '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        cursor: isListening ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span>{isListening ? '🎙️' : '🎤'}</span>
      <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
    </button>
  );
};
