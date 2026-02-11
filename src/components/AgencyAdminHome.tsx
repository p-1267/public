import React, { useState, useEffect } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { supabase } from '../lib/supabase';
import { ShowcaseNavWrapper } from './ShowcaseNavWrapper';
import { AgencySettingsPage } from './showcase/AgencySettingsPage';
import { AgencyCompliancePage } from './showcase/AgencyCompliancePage';
import { AgencyPoliciesPage } from './showcase/AgencyPoliciesPage';
import { AgencyTemplatesPage } from './showcase/AgencyTemplatesPage';
import { AgencyUsersPage } from './showcase/AgencyUsersPage';
import { AgencyBillingPage } from './showcase/AgencyBillingPage';
import { DeviceManagementPage } from './showcase/DeviceManagementPage';
import { IncidentReportsPage } from './showcase/IncidentReportsPage';
import { InsuranceEvidencePage } from './showcase/InsuranceEvidencePage';
import { AuditTimelinePage } from './showcase/AuditTimelinePage';
import { PayrollDetailBreakdown } from './PayrollDetailBreakdown';
import { OverrideAuditTrail } from './OverrideAuditTrail';
import { ScenarioModelingConsole } from './ScenarioModelingConsole';
import { ForensicReplayConsole } from './ForensicReplayConsole';
import { DepartmentsPage } from './DepartmentsPage';
import { AgencyResidents } from './AgencyResidents';

interface AgencyAdminHomeContentProps {
  setActiveTab?: (tab: string) => void;
}

const AgencyAdminHomeContent: React.FC<AgencyAdminHomeContentProps> = ({ setActiveTab }) => {
  const { mockAgencyId } = useShowcase();
  const [agency, setAgency] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mockAgencyId) {
      setLoading(true);
      return;
    }

    const fetchData = async () => {
      try {
        const [agencyRes, usersRes, residentsRes, shiftsRes, announcementsRes] = await Promise.all([
          supabase.from('agencies').select('*').eq('id', mockAgencyId).maybeSingle(),
          supabase.from('user_profiles').select('*').eq('agency_id', mockAgencyId),
          supabase.rpc('get_agency_residents', { p_agency_id: mockAgencyId }),
          supabase.from('shifts').select('*').eq('agency_id', mockAgencyId).eq('status', 'IN_PROGRESS'),
          supabase.from('announcements').select('*').eq('agency_id', mockAgencyId)
        ]);

        if (agencyRes.data) setAgency(agencyRes.data);
        if (usersRes.data) setUsers(usersRes.data);
        if (residentsRes.data) setResidents(residentsRes.data);
        if (shiftsRes.data) setActiveShifts(shiftsRes.data);
        if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      } catch (error) {
        console.error('Error fetching agency data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mockAgencyId]);

  const unacknowledgedAnnouncements = announcements.filter((a: any) => a.requires_acknowledgment);
  const caregivers = users.filter((u: any) => u.role_name === 'CAREGIVER');
  const supervisors = users.filter((u: any) => u.role_name === 'SUPERVISOR');
  const activeResidents = residents.filter((r: any) => r.status === 'active');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-slate-700 font-medium">Loading agency data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          margin: '0 0 8px 0',
          color: '#1a1a1a'
        }}>
          {agency?.name || 'Agency Dashboard'}
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          Agency Dashboard
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500', opacity: 0.9 }}>
            TOTAL STAFF
          </div>
          <div style={{ fontSize: '40px', fontWeight: '700' }}>
            {users.length}
          </div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
            {caregivers.length} Caregivers • {supervisors.length} Supervisors
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500', opacity: 0.9 }}>
            ACTIVE RESIDENTS
          </div>
          <div style={{ fontSize: '40px', fontWeight: '700' }}>
            {activeResidents.length}
          </div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
            All receiving care
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500', opacity: 0.9 }}>
            ACTIVE SHIFTS
          </div>
          <div style={{ fontSize: '40px', fontWeight: '700' }}>
            {activeShifts.length}
          </div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
            Currently in progress
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500', opacity: 0.9 }}>
            COMPLIANCE
          </div>
          <div style={{ fontSize: '40px', fontWeight: '700' }}>
            {agency?.compliance_score || 0}%
          </div>
          <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
            Above target
          </div>
        </div>
      </div>

      {unacknowledgedAnnouncements.length > 0 && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#92400e'
          }}>
            ⚠️ Pending Acknowledgments
          </div>
          <div style={{ fontSize: '16px', color: '#78350f' }}>
            {unacknowledgedAnnouncements.length} announcement(s) require staff acknowledgment
          </div>
        </div>
      )}

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Agency Operations
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                👥
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
                  Staff Management
                </div>
                <div style={{ fontSize: '16px', color: '#666' }}>
                  {users.length} total users
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab?.('users')}
              style={{
                width: '100%',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Manage Users
            </button>
          </div>

          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                👤
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
                  Resident Management
                </div>
                <div style={{ fontSize: '16px', color: '#666' }}>
                  {residents.length} residents
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab?.('residents')}
              style={{
                width: '100%',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Manage Residents
            </button>
          </div>

          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                📋
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
                  Compliance Center
                </div>
                <div style={{ fontSize: '16px', color: '#666' }}>
                  {agency?.compliance_score || 0}% score
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab?.('compliance')}
              style={{
                width: '100%',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              View Compliance
            </button>
          </div>

          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                ⚙️
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
                  Agency Settings
                </div>
                <div style={{ fontSize: '16px', color: '#666' }}>
                  Policies & config
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab?.('settings')}
              style={{
                width: '100%',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Configure Settings
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Recent Announcements
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {announcements.slice(0, 3).map((announcement: any) => {
            const acks = showcaseData.acknowledgments.filter((a: any) => a.announcement_id === announcement.id);
            const ackPercent = announcement.requires_acknowledgment ?
              Math.round((acks.length / users.length) * 100) : 100;

            return (
              <div
                key={announcement.id}
                style={{
                  background: 'white',
                  border: `2px solid ${announcement.priority === 'HIGH' ? '#fbbf24' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a1a1a'
                  }}>
                    {announcement.title}
                  </div>
                  {announcement.priority === 'HIGH' && (
                    <div style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      HIGH PRIORITY
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '16px', color: '#666', marginBottom: '12px' }}>
                  {announcement.content}
                </div>
                {announcement.requires_acknowledgment && (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Acknowledged by {ackPercent}% of staff
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => alert('Navigate to: Communication > Announcements\n\n(Showcase: Feature available via messaging tab or admin panel)')}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '16px',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#3b82f6',
            cursor: 'pointer'
          }}
        >
          View All Announcements
        </button>
      </div>

      <div style={{
        background: '#eff6ff',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '12px',
          color: '#1e40af'
        }}>
          System Ready for Production
        </h3>
        <div style={{ fontSize: '16px', color: '#1e3a8a', marginBottom: '16px' }}>
          All compliance requirements met. {residents.length} residents receiving care.
          {activeShifts.length} active shift{activeShifts.length !== 1 ? 's' : ''}.
        </div>
        <button
          onClick={() => alert('Navigate to: System Health Dashboard\n\n(Showcase: Super Admin feature - view system metrics, resource usage, and operational status)')}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          View System Health
        </button>
      </div>
    </div>
  );
};

export const AgencyAdminHome: React.FC = () => {
  return (
    <ShowcaseNavWrapper role="AGENCY_ADMIN">
      {(activeTab, setActiveTab) => {
        switch (activeTab) {
          case 'home':
            return (
              <div className="space-y-6">
                <AgencyAdminHomeContent setActiveTab={setActiveTab} />
                <div className="p-6">
                  <ScenarioModelingConsole />
                </div>
              </div>
            );
          case 'departments':
            return (
              <div className="p-6">
                <DepartmentsPage />
              </div>
            );
          case 'residents':
            return (
              <div className="p-6">
                <AgencyResidents agencyId="a0000000-0000-0000-0000-000000000001" />
              </div>
            );
          case 'settings':
            return <AgencySettingsPage />;
          case 'compliance':
            return <AgencyCompliancePage />;
          case 'devices':
            return <DeviceManagementPage />;
          case 'reports':
            return <IncidentReportsPage role="AGENCY_ADMIN" />;
          case 'insurance':
            return <InsuranceEvidencePage />;
          case 'audit':
            return (
              <div className="space-y-6 p-6">
                <ForensicReplayConsole />
                <OverrideAuditTrail />
                <AuditTimelinePage />
              </div>
            );
          case 'policies':
            return <AgencyPoliciesPage />;
          case 'templates':
            return <AgencyTemplatesPage />;
          case 'users':
            return <AgencyUsersPage />;
          case 'billing':
            return (
              <div className="space-y-6 p-6">
                <PayrollDetailBreakdown caregiverId="caregiver-showcase-001" startDate="2024-12-01" endDate="2024-12-31" />
                <AgencyBillingPage />
              </div>
            );
          default:
            return <AgencyAdminHomeContent setActiveTab={setActiveTab} />;
        }
      }}
    </ShowcaseNavWrapper>
  );
};
