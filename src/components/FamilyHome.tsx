import React, { useState, useEffect } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { supabase } from '../lib/supabase';
import { ShowcaseNavWrapper } from './ShowcaseNavWrapper';
import { FamilyCareTimelinePage } from './showcase/FamilyCareTimelinePage';
import { FamilyCarePlanPage } from './FamilyCarePlanPage';
import { FamilyCommunicationPage } from './showcase/FamilyCommunicationPage';
import { FamilyNotificationsPageReal } from './FamilyNotificationsPageReal';
import { FamilySettingsPageReal } from './FamilySettingsPageReal';
import { ResidentSafetyTrackingPage } from './showcase/ResidentSafetyTrackingPage';
import { DepartmentsPage } from './DepartmentsPage';
import { FamilyHealthMonitoringPage } from './FamilyHealthMonitoringPage';
import { FamilyMedicationsPage } from './showcase/FamilyMedicationsPage';
import { SeniorAppointmentsPage } from './SeniorAppointmentsPage';
import { SeniorDocumentsPage } from './SeniorDocumentsPage';
import { FamilyAIAssistant } from './FamilyAIAssistant';

const FamilyHomeContent: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [resident, setResident] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<any[]>([]);
  const [recentCare, setRecentCare] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedResidentId) {
      loadData();
    }
  }, [selectedResidentId]);

  const loadData = async () => {
    if (!selectedResidentId) return;

    const [residentRes, medsRes, metricsRes, careRes, devicesRes] = await Promise.all([
      supabase.from('residents').select('*').eq('id', selectedResidentId).maybeSingle(),
      supabase.from('resident_medications').select('*').eq('resident_id', selectedResidentId).eq('is_active', true),
      supabase.rpc('get_recent_health_metrics', { p_resident_id: selectedResidentId, p_hours: 24 }),
      supabase.from('observation_events').select('*').eq('resident_id', selectedResidentId).order('recorded_at', { ascending: false }).limit(5),
      supabase.from('device_registry').select('*').eq('resident_id', selectedResidentId)
    ]);

    setResident(residentRes.data);
    setMedications(medsRes.data || []);
    setHealthMetrics(metricsRes.data || []);
    setRecentCare(careRes.data || []);
    setDevices(devicesRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            height: '38px',
            width: '250px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px',
            marginBottom: '8px'
          }} />
          <div style={{
            height: '20px',
            width: '180px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px'
          }} />
        </div>

        <div style={{
          height: '180px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: '16px',
          marginBottom: '24px'
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            height: '120px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '16px'
          }} />
          <div style={{
            height: '120px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '16px'
          }} />
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  const medsTakenToday = medications.length;
  const medsTotalToday = medications.length;
  const adherencePercent = medsTotalToday > 0 ? Math.round((medsTakenToday / medsTotalToday) * 100) : 100;

  const latestBP = healthMetrics.find((m: any) => m.metric_type === 'blood_pressure_systolic');
  const latestHR = healthMetrics.find((m: any) => m.metric_type === 'heart_rate');

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '32px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 data-testid="resident-name" style={{
          fontSize: '32px',
          fontWeight: '600',
          margin: '0 0 8px 0',
          color: '#1a1a1a'
        }}>
          {resident?.full_name || 'Resident'}
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          Family Member View
        </p>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
          }}>
            ✓
          </div>
          <div>
            <h2 style={{ fontSize: '28px', margin: 0, fontWeight: '600' }}>Doing Well</h2>
            <p style={{ fontSize: '18px', margin: '4px 0 0 0', opacity: 0.95 }}>
              Last update: 2 hours ago
            </p>
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px',
          marginTop: '24px'
        }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>{adherencePercent}%</div>
            <div style={{ fontSize: '16px', opacity: 0.9 }}>Meds Taken</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>
              {latestBP ? `${latestBP.value_numeric}/${healthMetrics.find((m: any) => m.metric_type === 'blood_pressure_diastolic')?.value_numeric || ''}` : 'N/A'}
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9 }}>Blood Pressure</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '700' }}>
              {latestHR ? `${latestHR.value_numeric}` : 'N/A'}
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9 }}>Heart Rate</div>
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
          Today's Care Summary
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              💊
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Medications Active
              </div>
              <div style={{ fontSize: '16px', color: '#666' }}>
                {medications.length} active medications
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🍽️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Good Appetite
              </div>
              <div style={{ fontSize: '16px', color: '#666' }}>
                Ate 75-85% of meals today
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🩺
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                Vitals Stable
              </div>
              <div style={{ fontSize: '16px', color: '#666' }}>
                BP 135/82, HR 68, Temp 98.4°F
              </div>
            </div>
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
          Current Medications
          <span style={{
            fontSize: '14px',
            fontWeight: '400',
            color: '#666',
            marginLeft: '12px'
          }}>
            (View Only)
          </span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {medications.map((med: any) => (
            <div
              key={med.id}
              style={{
                background: '#f9fafb',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#1a1a1a'
              }}>
                {med.medication_name} {med.dosage}
              </div>
              <div style={{ fontSize: '16px', color: '#666' }}>
                {med.is_prn ? `As needed • ${med.prn_reason}` :
                 `${med.frequency.replace('_', ' ').toLowerCase()}`}
              </div>
              {med.is_controlled && (
                <div style={{
                  marginTop: '8px',
                  display: 'inline-block',
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Controlled Substance
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#1a1a1a'
        }}>
          Recent Activity
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentCare.slice(0, 3).map((event: any) => (
            <div
              key={event.id}
              style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#1a1a1a'
              }}>
                {event.event_type || 'Care Activity'}
              </div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
                {event.event_detail || 'Care provided'}
              </div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                {new Date(event.recorded_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {devices.some((d: any) => d.health_status === 'offline' || d.health_status === 'error') && (
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
            ⚠️ Device Attention Needed
          </div>
          <div style={{ fontSize: '16px', color: '#78350f' }}>
            A monitoring device is offline. Care team has been notified.
          </div>
        </div>
      )}

      <div style={{
        background: '#eff6ff',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#1e40af'
        }}>
          Your Notification Settings
        </div>
        <div style={{ fontSize: '16px', color: '#1e3a8a', marginBottom: '16px' }}>
          Daily summaries: Email • Emergency alerts: SMS + Email
        </div>
        <button style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Update Preferences
        </button>
      </div>
    </div>
  );
};

export const FamilyHome: React.FC = () => {
  return (
    <>
      <ShowcaseNavWrapper role="FAMILY_VIEWER">
        {(activeTab) => {
          switch (activeTab) {
            case 'home':
              return <FamilyHomeContent />;
            case 'departments':
              return (
                <div className="p-6">
                  <DepartmentsPage />
                </div>
              );
            case 'care':
              return <FamilyCareTimelinePage />;
            case 'care-plan':
              return <FamilyCarePlanPage />;
            case 'health-monitoring':
              return <FamilyHealthMonitoringPage />;
            case 'medications':
              return <FamilyMedicationsPage />;
            case 'appointments':
              return <SeniorAppointmentsPage />;
            case 'documents':
              return <SeniorDocumentsPage />;
            case 'safety':
              return <ResidentSafetyTrackingPage residentName="Pat Anderson" />;
            case 'communication':
              return <FamilyCommunicationPage />;
            case 'notifications':
              return <FamilyNotificationsPageReal />;
            case 'settings':
              return <FamilySettingsPageReal />;
            default:
              return <FamilyHomeContent />;
          }
        }}
      </ShowcaseNavWrapper>
      <FamilyAIAssistant />
    </>
  );
};
