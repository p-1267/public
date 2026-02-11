import React from 'react';

export type InsightType = 'brain_processed' | 'brain_blocking' | 'ai_suggestion' | 'risk_detected';

interface BrainInsightBannerProps {
  type: InsightType;
  title: string;
  message: string;
  reason?: string;
  suggestedAction?: string;
  onDismiss?: () => void;
}

export const BrainInsightBanner: React.FC<BrainInsightBannerProps> = ({
  type,
  title,
  message,
  reason,
  suggestedAction,
  onDismiss,
}) => {
  const getStyles = () => {
    switch (type) {
      case 'brain_blocking':
        return {
          bg: '#fef2f2',
          border: '#dc2626',
          icon: '🛑',
          titleColor: '#991b1b',
          textColor: '#7f1d1d',
        };
      case 'risk_detected':
        return {
          bg: '#fff7ed',
          border: '#f59e0b',
          icon: '⚠️',
          titleColor: '#92400e',
          textColor: '#78350f',
        };
      case 'ai_suggestion':
        return {
          bg: '#eff6ff',
          border: '#3b82f6',
          icon: '💡',
          titleColor: '#1e40af',
          textColor: '#1e3a8a',
        };
      case 'brain_processed':
        return {
          bg: '#f0fdf4',
          border: '#10b981',
          icon: '✓',
          titleColor: '#065f46',
          textColor: '#064e3b',
        };
      default:
        return {
          bg: '#f8fafc',
          border: '#64748b',
          icon: 'ℹ️',
          titleColor: '#334155',
          textColor: '#1e293b',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      style={{
        backgroundColor: styles.bg,
        border: `2px solid ${styles.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
        position: 'relative',
      }}
    >
      {type === 'brain_blocking' && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '16px',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          BLOCKING
        </div>
      )}

      {type === 'ai_suggestion' && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '16px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          AI SUGGESTION • OPTIONAL
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px', flexShrink: 0 }}>
          {styles.icon}
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: 700,
              color: styles.titleColor,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              color: styles.textColor,
              lineHeight: '1.5',
            }}
          >
            {message}
          </p>

          {reason && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: styles.titleColor,
                  marginBottom: '4px',
                }}
              >
                WHY:
              </div>
              <div style={{ fontSize: '13px', color: styles.textColor }}>
                {reason}
              </div>
            </div>
          )}

          {suggestedAction && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'rgba(0,0,0,0.05)',
                borderRadius: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: styles.titleColor,
                  marginBottom: '4px',
                }}
              >
                SUGGESTED ACTION:
              </div>
              <div style={{ fontSize: '13px', color: styles.textColor }}>
                {suggestedAction}
              </div>
            </div>
          )}
        </div>

        {onDismiss && type !== 'brain_blocking' && (
          <button
            onClick={onDismiss}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              color: styles.textColor,
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
