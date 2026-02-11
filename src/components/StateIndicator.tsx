interface StateIndicatorProps {
  label: string
  value: string
  variant: 'neutral' | 'active' | 'warning' | 'error'
}

const variantStyles: Record<StateIndicatorProps['variant'], string> = {
  neutral: '#64748b',
  active: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
}

export function StateIndicator({ label, value, variant }: StateIndicatorProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '16px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
    }}>
      <span style={{
        fontSize: '12px',
        fontWeight: 500,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: variantStyles[variant],
        }} />
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#1e293b',
        }}>
          {value}
        </span>
      </div>
    </div>
  )
}
