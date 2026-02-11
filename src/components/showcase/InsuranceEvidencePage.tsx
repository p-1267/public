import React, { useState } from 'react';
import { InsuranceClaimPacketStatus } from '../InsuranceClaimPacketStatus';

export const InsuranceEvidencePage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('DECEMBER_2024');

  const evidencePack = {
    period: 'December 1-30, 2024',
    resident: 'Pat Anderson',
    residentId: 'RES-001',
    generatedAt: new Date().toLocaleString(),
    generatedBy: 'Sam Taylor (Supervisor)',
    baseline: {
      cognitiveLevel: 'Moderate dementia',
      mobilityLevel: 'Ambulatory with walker',
      adlSupport: 'Partial assistance',
      medications: 5,
      allergies: 'Penicillin',
      dietRestrictions: 'Low sodium',
    },
    carePlanned: {
      medicationAdministrations: 150,
      mealAssistance: 90,
      personalCare: 60,
      mobilityAssistance: 90,
      socialActivities: 20,
      healthMonitoring: 30,
    },
    careDelivered: {
      medicationAdministrations: 148,
      mealAssistance: 89,
      personalCare: 60,
      mobilityAssistance: 88,
      socialActivities: 18,
      healthMonitoring: 30,
    },
    attendance: {
      totalShifts: 90,
      shiftsCompleted: 90,
      caregiverChanges: 3,
      averageResponseTime: '2.3 minutes',
    },
    medicationAdherence: {
      scheduled: 150,
      administered: 148,
      missed: 2,
      adherenceRate: '98.7%',
    },
    exceptions: [
      {
        date: '2024-12-15',
        type: 'Missed Medication',
        reason: 'Resident refused (documented)',
        resolution: 'Physician notified, alternative administration time approved',
        resolved: true,
      },
      {
        date: '2024-12-22',
        type: 'Missed Medication',
        reason: 'Concurrent emergency with another resident',
        resolution: 'Administered 45 minutes late with physician approval',
        resolved: true,
      },
      {
        date: '2024-12-29',
        type: 'Fall Incident',
        reason: 'Loss of balance during bathroom transfer',
        resolution: 'No injury, physician assessment completed, mobility equipment reviewed',
        resolved: true,
      },
    ],
    incidents: 3,
    incidentsResolved: 3,
    familyCommunications: 12,
    physicianConsults: 4,
  };

  const getCompliancePercentage = (delivered: number, planned: number) => {
    return Math.round((delivered / planned) * 100);
  };

  const handleExport = (format: 'PDF' | 'CSV') => {
    alert(
      `📄 Export ${format}\n\n` +
      `Insurance Evidence Pack for ${evidencePack.resident}\n` +
      `Period: ${evidencePack.period}\n` +
      `Generated: ${evidencePack.generatedAt}\n\n` +
      `This ${format} would contain:\n` +
      `- Complete care delivery documentation\n` +
      `- Attendance verification\n` +
      `- Medication adherence records\n` +
      `- Exception details with resolutions\n` +
      `- Incident reports with outcomes\n` +
      `- Timestamped audit trail\n\n` +
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
        maxWidth: '1200px',
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
          SHOWCASE MODE — Insurance-Ready Evidence Pack (Simulated)
        </div>

        <div style={{ marginBottom: '24px' }}>
          <InsuranceClaimPacketStatus />
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
            Insurance Evidence Pack
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
          }}>
            Comprehensive care documentation for insurance claims and regulatory compliance.
          </p>
        </div>

        <div style={{
          backgroundColor: '#dbeafe',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e40af', marginBottom: '8px' }}>
            📋 LEGAL NOTICE
          </div>
          <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6' }}>
            This evidence pack is generated from immutable audit logs with cryptographic verification.
            All timestamps are synchronized with authoritative time sources. Identity binding ensures
            non-repudiation. This document is suitable for insurance claims, regulatory audits, and legal proceedings.
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Period</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{evidencePack.period}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Resident</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{evidencePack.resident}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Generated</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{evidencePack.generatedAt}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Generated By</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{evidencePack.generatedBy}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleExport('PDF')}
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
              📄 Export as PDF
            </button>
            <button
              onClick={() => handleExport('CSV')}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              📊 Export as CSV
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            Resident Baseline Snapshot
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {Object.entries(evidencePack.baseline).map(([key, value]) => (
              <div key={key} style={{
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
              }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            Care Delivered vs Care Planned
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.keys(evidencePack.carePlanned).map((key) => {
              const planned = evidencePack.carePlanned[key as keyof typeof evidencePack.carePlanned];
              const delivered = evidencePack.careDelivered[key as keyof typeof evidencePack.careDelivered];
              const percentage = getCompliancePercentage(delivered, planned);
              return (
                <div key={key} style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: percentage >= 95 ? '#10b981' : percentage >= 90 ? '#f59e0b' : '#ef4444',
                    }}>
                      {percentage}%
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: '#64748b',
                    marginBottom: '8px',
                  }}>
                    <span>Planned: {planned}</span>
                    <span>Delivered: {delivered}</span>
                  </div>
                  <div style={{
                    height: '8px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 95 ? '#10b981' : percentage >= 90 ? '#f59e0b' : '#ef4444',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
              Attendance Proof
            </h3>
            {Object.entries(evidencePack.attendance).map(([key, value]) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
              Medication Adherence
            </h3>
            {Object.entries(evidencePack.medicationAdherence).map(([key, value]) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <span style={{ fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: key === 'adherenceRate' && typeof value === 'string' && parseFloat(value) >= 95 ? '#10b981' : '#0f172a',
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
            Exceptions and Resolutions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {evidencePack.exceptions.map((exception, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  backgroundColor: exception.resolved ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${exception.resolved ? '#86efac' : '#fecaca'}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {exception.type}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {exception.date}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                  <strong>Reason:</strong> {exception.reason}
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px' }}>
                  <strong>Resolution:</strong> {exception.resolution}
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: exception.resolved ? '#065f46' : '#991b1b',
                }}>
                  {exception.resolved ? '✓ Resolved' : '⚠ Unresolved'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
