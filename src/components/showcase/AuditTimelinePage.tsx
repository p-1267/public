import React, { useState } from 'react';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  details: string;
  device: string;
  ipAddress: string;
  location?: string;
  consentSnapshot?: string;
  brainDecision?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'CARE' | 'ADMIN' | 'ACCESS' | 'MEDICATION' | 'INCIDENT' | 'CONSENT';
}

export const AuditTimelinePage: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const auditEvents: AuditEvent[] = [
    {
      id: 'AUD-2024-12-30-001',
      timestamp: '2024-12-30 10:15:23.456 UTC',
      actor: 'Jordan Lee',
      actorRole: 'CAREGIVER',
      action: 'MEDICATION_ADMINISTERED',
      target: 'Pat Anderson',
      details: 'Lisinopril 10mg administered as scheduled',
      device: 'iPad Pro (Model A2379)',
      ipAddress: '192.168.1.45',
      location: 'Resident Room 101',
      consentSnapshot: 'Medication consent on file, expires 2025-06-30',
      brainDecision: 'Approved - No contraindications detected',
      severity: 'INFO',
      category: 'MEDICATION',
    },
    {
      id: 'AUD-2024-12-30-002',
      timestamp: '2024-12-30 10:20:15.789 UTC',
      actor: 'Sam Taylor',
      actorRole: 'SUPERVISOR',
      action: 'REPORT_APPROVED',
      target: 'Incident Report IR-2024-001',
      details: 'Fall incident report reviewed and approved',
      device: 'iPhone 14 Pro',
      ipAddress: '192.168.1.52',
      consentSnapshot: 'N/A - Administrative action',
      severity: 'WARNING',
      category: 'INCIDENT',
    },
    {
      id: 'AUD-2024-12-30-003',
      timestamp: '2024-12-30 09:30:00.123 UTC',
      actor: 'Casey Morgan',
      actorRole: 'CAREGIVER',
      action: 'CARE_LOG_CREATED',
      target: 'Robert Chen',
      details: 'Morning care routine completed - bathing and dressing assistance provided',
      device: 'iPad Mini (Model A2568)',
      ipAddress: '192.168.1.47',
      location: 'Resident Room 105',
      consentSnapshot: 'Personal care consent on file, expires 2025-03-15',
      brainDecision: 'Processed - Wellness score updated (+2)',
      severity: 'INFO',
      category: 'CARE',
    },
    {
      id: 'AUD-2024-12-30-004',
      timestamp: '2024-12-30 08:45:30.234 UTC',
      actor: 'Admin User',
      actorRole: 'AGENCY_ADMIN',
      action: 'USER_PERMISSION_MODIFIED',
      target: 'Jordan Lee',
      details: 'Added permission: VIEW_ALL_RESIDENTS',
      device: 'MacBook Pro (Chrome)',
      ipAddress: '192.168.1.10',
      consentSnapshot: 'N/A - Administrative action',
      brainDecision: 'Security review triggered - approved after verification',
      severity: 'CRITICAL',
      category: 'ACCESS',
    },
    {
      id: 'AUD-2024-12-30-005',
      timestamp: '2024-12-30 08:15:00.567 UTC',
      actor: 'Jordan Lee',
      actorRole: 'CAREGIVER',
      action: 'SHIFT_STARTED',
      target: 'Shift ID: SH-2024-12-30-001',
      details: 'Clock-in via geolocation verification - 0.2 miles from facility',
      device: 'iPad Pro (Model A2379)',
      ipAddress: '192.168.1.45',
      location: 'Main Facility Entrance',
      consentSnapshot: 'N/A - Operational action',
      severity: 'INFO',
      category: 'ADMIN',
    },
    {
      id: 'AUD-2024-12-30-006',
      timestamp: '2024-12-30 07:45:12.890 UTC',
      actor: 'Maria Garcia (Senior)',
      actorRole: 'SENIOR',
      action: 'CONSENT_GRANTED',
      target: 'Data Sharing with Family',
      details: 'Granted permission for health data sharing with Sarah Anderson (daughter)',
      device: 'iPad (Model A2603)',
      ipAddress: '192.168.1.88',
      consentSnapshot: 'New consent recorded, effective immediately',
      brainDecision: 'Consent capacity verified via cognitive assessment',
      severity: 'CRITICAL',
      category: 'CONSENT',
    },
    {
      id: 'AUD-2024-12-29-007',
      timestamp: '2024-12-29 20:30:45.123 UTC',
      actor: 'Jordan Lee',
      actorRole: 'CAREGIVER',
      action: 'EMERGENCY_TRIGGERED',
      target: 'Pat Anderson',
      details: 'Fall detection device triggered - caregiver responded in 45 seconds',
      device: 'Fall Detection Pendant',
      ipAddress: 'N/A - IoT Device',
      location: 'Bathroom, Room 101',
      consentSnapshot: 'Emergency response consent on file',
      brainDecision: 'EMERGENCY MODE - All care restrictions lifted',
      severity: 'CRITICAL',
      category: 'INCIDENT',
    },
    {
      id: 'AUD-2024-12-29-008',
      timestamp: '2024-12-29 14:15:00.456 UTC',
      actor: 'System',
      actorRole: 'AUTOMATED',
      action: 'MEDICATION_REMINDER_SENT',
      target: 'Pat Anderson',
      details: 'Automated reminder sent for 2:00 PM medication',
      device: 'Server (Automated)',
      ipAddress: 'Internal',
      consentSnapshot: 'Notification consent on file',
      brainDecision: 'Reminder scheduled based on medication adherence pattern',
      severity: 'INFO',
      category: 'MEDICATION',
    },
  ];

  const filteredEvents = auditEvents.filter(event => {
    if (filterCategory !== 'ALL' && event.category !== filterCategory) return false;
    if (filterSeverity !== 'ALL' && event.severity !== filterSeverity) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'INFO': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CARE': return '🩺';
      case 'MEDICATION': return '💊';
      case 'INCIDENT': return '🚨';
      case 'ACCESS': return '🔐';
      case 'CONSENT': return '📋';
      case 'ADMIN': return '⚙️';
      default: return '📄';
    }
  };

  const handleExport = () => {
    alert(
      `📄 Export Audit Log\n\n` +
      `Period: Last 7 Days\n` +
      `Total Events: ${filteredEvents.length}\n` +
      `Format: Cryptographically Signed PDF\n\n` +
      `This export includes:\n` +
      `- Complete chronological timeline\n` +
      `- Actor identity verification\n` +
      `- Device fingerprinting\n` +
      `- Consent snapshots\n` +
      `- Brain decision rationale\n` +
      `- Tamper-proof timestamps\n\n` +
      `Suitable for legal proceedings and regulatory audits.\n\n` +
      `(Showcase Mode: Export simulated)`
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '1400px',
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
          SHOWCASE MODE — Immutable Audit Log (Simulated)
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a',
          }}>
            Legal / Audit Timeline
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
          }}>
            Immutable, cryptographically verified audit trail for legal defense and regulatory compliance.
          </p>
        </div>

        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
            🔒 IMMUTABLE AUDIT LOG
          </div>
          <div style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: '1.6' }}>
            All events are timestamped with authoritative time sources and cryptographically signed.
            Identity binding ensures non-repudiation. Consent snapshots are captured at the moment of action.
            This log cannot be modified or deleted and is suitable for legal proceedings.
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="CARE">Care</option>
                <option value="MEDICATION">Medication</option>
                <option value="INCIDENT">Incident</option>
                <option value="ACCESS">Access</option>
                <option value="CONSENT">Consent</option>
                <option value="ADMIN">Admin</option>
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="ALL">All Severities</option>
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <button
              onClick={handleExport}
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
            >
              📄 Export Signed PDF
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '20px',
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: '#e2e8f0',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {filteredEvents.map((event, idx) => (
                <div
                  key={event.id}
                  style={{
                    position: 'relative',
                    paddingLeft: '56px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: getSeverityColor(event.severity),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      border: '3px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    {getCategoryIcon(event.category)}
                  </div>

                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px',
                    border: `2px solid ${event.severity === 'CRITICAL' ? '#fecaca' : '#e2e8f0'}`,
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                    }}>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0f172a',
                          marginBottom: '4px',
                        }}>
                          {event.action.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {event.timestamp}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: getSeverityColor(event.severity) + '20',
                          color: getSeverityColor(event.severity),
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}>
                          {event.severity}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#e2e8f0',
                          color: '#475569',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>
                          {event.category}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '12px',
                      marginBottom: '12px',
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Actor</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {event.actor}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{event.actorRole}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Target</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {event.target}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Device</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {event.device}
                        </div>
                      </div>
                      {event.location && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Location</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            {event.location}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{
                      padding: '12px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                        {event.details}
                      </div>
                    </div>

                    {event.brainDecision && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '8px',
                        marginBottom: '8px',
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                          🧠 BRAIN DECISION:
                        </div>
                        <div style={{ fontSize: '12px', color: '#1e3a8a' }}>
                          {event.brainDecision}
                        </div>
                      </div>
                    )}

                    {event.consentSnapshot && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', marginBottom: '4px' }}>
                          📋 CONSENT SNAPSHOT:
                        </div>
                        <div style={{ fontSize: '12px', color: '#064e3b' }}>
                          {event.consentSnapshot}
                        </div>
                      </div>
                    )}

                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '11px',
                      color: '#94a3b8',
                    }}>
                      Audit ID: {event.id} • IP: {event.ipAddress} • Immutable Record
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
