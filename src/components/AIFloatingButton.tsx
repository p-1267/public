import React, { useState } from 'react';
import { AIAssistPanel } from './AIAssistPanel';

interface AIContext {
  type: string;
  residentId?: string;
  [key: string]: any;
}

interface AIFloatingButtonProps {
  context: AIContext;
  aiEnabled?: boolean;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({ context, aiEnabled = true }) => {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          width: '60px',
          height: '60px',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '50%',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
        }}
        title="AI Assist"
      >
        ✨
      </button>

      {showPanel && (
        <AIAssistPanel
          context={context}
          onClose={() => setShowPanel(false)}
          aiEnabled={aiEnabled}
        />
      )}
    </>
  );
};
