import React, { useState } from 'react';
import { AIDraftReportWizard } from '../AIDraftReportWizard';
import { AIAssistPanel } from '../AIAssistPanel';

interface IncidentReport {
  id: string;
  type: 'INCIDENT' | 'FALL' | 'MEDICATION_ERROR' | 'MISSED_CARE';
  resident: string;
  caregiver: string;
  supervisor?: string;
  date: string;
  time: string;
  shift: string;
  location: string;
  description: string;
  actionsTaken: string;
  brainAssessment: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface IncidentReportsPageProps {
  role: 'CAREGIVER' | 'SUPERVISOR' | 'AGENCY_ADMIN';
}

export const IncidentReportsPage: React.FC<IncidentReportsPageProps> = ({ role }) => {
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [showAIDraftWizard, setShowAIDraftWizard] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);

  const reports: IncidentReport[] = [
    {
      id: 'IR-2024-001',
      type: 'FALL',
      resident: 'Pat Anderson',
      caregiver: 'Jordan Lee',
      supervisor: 'Sam Taylor',
      date: '2024-12-29',
      time: '14:30',
      shift: 'Day Shift',
      location: 'Bathroom',
      description: 'Resident experienced a fall while transitioning from wheelchair to toilet. Fall detection device triggered alert. Caregiver arrived within 45 seconds.',
      actionsTaken: 'Assessed for injury, no visible wounds or pain reported. Assisted resident to bed. Vital signs checked: BP 130/85, HR 78. Physician notified. Family contacted.',
      brainAssessment: 'Risk level elevated to MODERATE. Pattern detected: 3rd bathroom fall in 30 days. Recommend mobility assessment and bathroom safety equipment review.',
      reviewStatus: 'APPROVED',
      reviewedBy: 'Sam Taylor',
      reviewedAt: '2024-12-29 15:45',
      severity: 'MEDIUM',
    },
    {
      id: 'IR-2024-002',
      type: 'MEDICATION_ERROR',
      resident: 'Robert Chen',
      caregiver: 'Casey Morgan',
      date: '2024-12-29',
      time: '08:15',
      shift: 'Morning Shift',
      location: 'Dining Room',
      description: 'Incorrect dosage administered for blood pressure medication. Resident received 10mg instead of prescribed 5mg due to packaging confusion.',
      actionsTaken: 'Medication administration stopped immediately. Physician contacted. BP monitored every 30 minutes for 4 hours. No adverse effects observed. Incident documented. Pharmacist contacted to review packaging.',
      brainAssessment: 'CRITICAL priority. Medication error detected. Automatic notification sent to physician, supervisor, and pharmacy. Similar packaging flagged across all residents.',
      reviewStatus: 'PENDING',
      severity: 'HIGH',
    },
    {
      id: 'IR-2024-003',
      type: 'MISSED_CARE',
      resident: 'Maria Garcia',
      caregiver: 'Jordan Lee',
      supervisor: 'Sam Taylor',
      date: '2024-12-28',
      time: '20:00',
      shift: 'Evening Shift',
      location: 'Resident Room',
      description: 'Evening medication administration was delayed by 45 minutes due to concurrent emergency with another resident.',
      actionsTaken: 'Medication administered at 20:45 with physician approval. Resident monitored for any adverse effects. No complications observed.',
      brainAssessment: 'LOW risk - acceptable delay with physician approval. Staffing level flagged for review during concurrent emergencies.',
      reviewStatus: 'REJECTED',
      reviewReason: 'Insufficient documentation of physician approval. Resubmit with approval timestamp and method of contact.',
      reviewedBy: 'Sam Taylor',
      reviewedAt: '2024-12-29 09:00',
      severity: 'LOW',
    },
    {
      id: 'IR-2024-004',
      type: 'INCIDENT',
      resident: 'Pat Anderson',
      caregiver: 'Jordan Lee',
      date: '2024-12-30',
      time: '10:15',
      shift: 'Morning Shift',
      location: 'Living Room',
      description: 'Resident became agitated and verbally aggressive with another resident during group activity. No physical contact occurred.',
      actionsTaken: 'Resident separated and offered one-on-one time. Activity paused. Both residents calmed within 10 minutes. Behavior documented for physician review.',
      brainAssessment: 'MEDIUM priority. Behavioral pattern noted - 2nd incident this week. Recommend medication review and behavioral health consultation.',
      reviewStatus: 'PENDING',
      severity: 'MEDIUM',
    },
  ];

  const filteredReports = reports.filter(r => {
    if (role === 'CAREGIVER') return r.caregiver === 'Jordan Lee';
    if (filterStatus === 'ALL') return true;
    return r.reviewStatus === filterStatus;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'FALL': return '🚨 Fall Report';
      case 'MEDICATION_ERROR': return '💊 Medication Error';
      case 'MISSED_CARE': return '⏰ Missed Care';
      case 'INCIDENT': return '⚠️ Incident Report';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#10b981';
      case 'REJECTED': return '#ef4444';
      case 'PENDING': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f59e0b';
      case 'MEDIUM': return '#3b82f6';
      case 'LOW': return '#10b981';
      default: return '#64748b';
    }
  };

  const handleReview = (reportId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    alert(
      `✓ Report ${action === 'APPROVE' ? 'Approved' : 'Rejected'}\n\n` +
      `Report ID: ${reportId}\n` +
      `Reviewer: Sam Taylor\n` +
      `Timestamp: ${new Date().toLocaleString()}\n` +
      (reason ? `Reason: ${reason}\n` : '') +
      `\n(Showcase Mode: review recorded with identity binding)`
    );
    setSelectedReport(null);
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
          SHOWCASE MODE — Simulated Incident Reports
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
            {role === 'SUPERVISOR' ? 'Incident Reports - Review Queue' : 'Incident Reports'}
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
          }}>
            {role === 'CAREGIVER'
              ? 'View your submitted incident reports and their review status.'
              : role === 'SUPERVISOR'
              ? 'Review and approve incident reports submitted by caregivers.'
              : 'View all incident reports across the agency.'}
          </p>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
        }}>
          <button
            onClick={() => setShowAIDraftWizard(true)}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ✨ Draft Report with AI
          </button>
          <button
            onClick={() => setShowAIAssist(true)}
            style={{
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#3b82f6',
              backgroundColor: '#eff6ff',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            AI Assist
          </button>
        </div>

        {(role === 'SUPERVISOR' || role === 'AGENCY_ADMIN') && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            gap: '12px',
          }}>
            <button
              onClick={() => setFilterStatus('ALL')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: filterStatus === 'ALL' ? '#ffffff' : '#64748b',
                backgroundColor: filterStatus === 'ALL' ? '#0f172a' : '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: filterStatus === 'PENDING' ? '#ffffff' : '#64748b',
                backgroundColor: filterStatus === 'PENDING' ? '#f59e0b' : '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Pending ({reports.filter(r => r.reviewStatus === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: filterStatus === 'APPROVED' ? '#ffffff' : '#64748b',
                backgroundColor: filterStatus === 'APPROVED' ? '#10b981' : '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Approved ({reports.filter(r => r.reviewStatus === 'APPROVED').length})
            </button>
            <button
              onClick={() => setFilterStatus('REJECTED')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: filterStatus === 'REJECTED' ? '#ffffff' : '#64748b',
                backgroundColor: filterStatus === 'REJECTED' ? '#ef4444' : '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Rejected ({reports.filter(r => r.reviewStatus === 'REJECTED').length})
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredReports.map((report) => (
            <div
              key={report.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: `2px solid ${report.reviewStatus === 'PENDING' ? '#f59e0b' : '#e2e8f0'}`,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}>
                      {getTypeLabel(report.type)}
                    </h3>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: getSeverityColor(report.severity) + '20',
                      color: getSeverityColor(report.severity),
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}>
                      {report.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {report.id} • {report.date} at {report.time}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: getStatusColor(report.reviewStatus) + '20',
                  color: getStatusColor(report.reviewStatus),
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {report.reviewStatus}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Resident</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{report.resident}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Caregiver</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{report.caregiver}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Shift</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{report.shift}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Location</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{report.location}</div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Description:
                </div>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                  {report.description}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Actions Taken:
                </div>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                  {report.actionsTaken}
                </div>
              </div>

              <div style={{
                padding: '16px',
                backgroundColor: '#eff6ff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '8px' }}>
                  🧠 Brain Assessment:
                </div>
                <div style={{ fontSize: '14px', color: '#1e3a8a', lineHeight: '1.6' }}>
                  {report.brainAssessment}
                </div>
              </div>

              {report.reviewStatus === 'REJECTED' && report.reviewReason && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
                    Rejection Reason:
                  </div>
                  <div style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: '1.6' }}>
                    {report.reviewReason}
                  </div>
                  <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '8px' }}>
                    Reviewed by {report.reviewedBy} on {report.reviewedAt}
                  </div>
                </div>
              )}

              {report.reviewStatus === 'APPROVED' && report.reviewedBy && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#065f46',
                  marginBottom: '16px',
                }}>
                  ✓ Approved by {report.reviewedBy} on {report.reviewedAt}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedReport(report)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  View Full Report
                </button>
                {role === 'SUPERVISOR' && report.reviewStatus === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReview(report.id, 'APPROVE')}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#ffffff',
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason (required):');
                        if (reason) handleReview(report.id, 'REJECT', reason);
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#ffffff',
                        backgroundColor: '#ef4444',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {selectedReport && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              zIndex: 1000,
            }}
            onClick={() => setSelectedReport(null)}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 700 }}>
                Full Report Details
              </h2>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                This is a complete legal record suitable for insurance claims, regulatory compliance, and legal defense.
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#64748b',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showAIDraftWizard && (
          <AIDraftReportWizard
            context={{
              role: role,
              currentPage: 'Incident Reports',
            }}
            onClose={() => setShowAIDraftWizard(false)}
          />
        )}

        {showAIAssist && (
          <AIAssistPanel
            context={{
              role: role,
              currentPage: 'Incident Reports',
            }}
            onClose={() => setShowAIAssist(false)}
            aiEnabled={true}
          />
        )}
      </div>
    </div>
  );
};
