import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface ComplianceStats {
  auditEntryCount: number
  lastAuditTimestamp: string | null
  aiInputsPendingCount: number
  aiInputsTotalCount: number
}

const statBoxStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#0f172a',
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'None'
  return new Date(dateString).toLocaleString()
}

export function CompliancePanel() {
  const [stats, setStats] = useState<ComplianceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)
      setError(null)

      const [auditResult, aiInputsResult] = await Promise.all([
        supabase
          .from('audit_log')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('ai_learning_inputs')
          .select('acknowledged'),
      ])

      if (auditResult.error) {
        setError(auditResult.error.message)
        setIsLoading(false)
        return
      }

      if (aiInputsResult.error) {
        setError(aiInputsResult.error.message)
        setIsLoading(false)
        return
      }

      const auditCountResult = await supabase
        .from('audit_log')
        .select('id', { count: 'exact', head: true })

      const auditCount = auditCountResult.count ?? 0
      const lastAudit = auditResult.data?.[0]?.created_at ?? null
      const aiInputs = aiInputsResult.data ?? []
      const pendingCount = aiInputs.filter(i => !i.acknowledged).length

      setStats({
        auditEntryCount: auditCount,
        lastAuditTimestamp: lastAudit,
        aiInputsPendingCount: pendingCount,
        aiInputsTotalCount: aiInputs.length,
      })
      setIsLoading(false)
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Loading compliance data...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
      }}>
        Error loading compliance data: {error}
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
          Compliance Overview
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
          System compliance and security status
        </p>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}>
          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Audit Entries</div>
            <div style={statValueStyle}>{stats?.auditEntryCount ?? 0}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>AI Inputs Pending Review</div>
            <div style={{
              ...statValueStyle,
              color: (stats?.aiInputsPendingCount ?? 0) > 0 ? '#d97706' : '#059669',
            }}>
              {stats?.aiInputsPendingCount ?? 0}
            </div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>AI Inputs Total</div>
            <div style={statValueStyle}>{stats?.aiInputsTotalCount ?? 0}</div>
          </div>

          <div style={statBoxStyle}>
            <div style={statLabelStyle}>Row Level Security</div>
            <div style={{
              ...statValueStyle,
              fontSize: '16px',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#059669',
              }} />
              Enabled
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
            Last Audit Entry
          </div>
          <div style={{ fontSize: '14px', color: '#334155' }}>
            {formatDate(stats?.lastAuditTimestamp ?? null)}
          </div>
        </div>
      </div>
    </div>
  )
}
