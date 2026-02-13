import React, { useState, useEffect } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { ShowcaseNavWrapper } from './ShowcaseNavWrapper';
import { isRoleActiveInScenario } from '../config/roleVisibilityMatrix';
import { SeniorMedicationsPage } from './SeniorMedicationsPage';
import { SeniorHealthInputsPageReal } from './SeniorHealthInputsPageReal';
import { SeniorNotificationsPageReal } from './SeniorNotificationsPageReal';
import { SeniorSettingsPageReal } from './SeniorSettingsPageReal';
import { SeniorVoiceDocumentationViewer } from './SeniorVoiceDocumentationViewer';
import { SeniorDevicePairingPage } from './SeniorDevicePairingPage';
import { SeniorHealthDashboard } from './SeniorHealthDashboard';
import { SeniorAppointmentsPage } from './SeniorAppointmentsPage';
import { SeniorLabTestsPage } from './SeniorLabTestsPage';
import { SeniorCarePlanPage } from './SeniorCarePlanPage';
import { SeniorCareTimeline } from './SeniorCareTimeline';
import { SeniorDocumentsPage } from './SeniorDocumentsPage';
import { SeniorMessagingPage } from './SeniorMessagingPage';
import { SeniorSOSButton } from './SeniorSOSButton';
import { SeniorAIAssistant } from './SeniorAIAssistant';
import { SeniorOperatingModeSwitcher } from './SeniorOperatingModeSwitcher';
import { CareContextProvider } from '../contexts/CareContextProvider';
import { ResidentContextCard } from './ResidentContextCard';
import { supabase } from '../lib/supabase';
import { CognitiveSnapshot } from './cognitive/CognitiveSnapshot';

const SeniorHomeContent: React.FC = () => {
  const { selectedResidentId, currentRole, currentScenario } = useShowcase();
  const [resident, setResident] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  if (!isRoleActiveInScenario(currentRole, currentScenario?.id || null)) {
    return (
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '64px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          padding: '48px',
          color: '#92400e'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
            Role Not Active in This Scenario
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '24px' }}>
            The <strong>{currentRole}</strong> role is not available in scenario <strong>{currentScenario?.id}</strong>.
          </p>
          <p style={{ fontSize: '14px', color: '#78350f' }}>
            Please select a different role from the showcase panel or return to scenario selection.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (selectedResidentId) {
      loadData();
    }
  }, [selectedResidentId]);

  const loadData = async () => {
    if (!selectedResidentId) return;

    console.log('[SENIOR_HOME_LOAD] Starting data load for resident:', selectedResidentId);
    setLoadError(null);

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DATA_LOAD_TIMEOUT')), 10000)
      );

      const dataPromise = Promise.all([
        supabase.from('residents').select('*').eq('id', selectedResidentId).maybeSingle(),
        supabase.from('appointments').select('*').eq('resident_id', selectedResidentId).order('scheduled_at', { ascending: true }),
        supabase.from('resident_medications').select('*').eq('resident_id', selectedResidentId).eq('is_active', true),
        supabase.from('device_registry').select('*').eq('resident_id', selectedResidentId)
      ]);

      const [residentRes, appointmentsRes, medicationsRes, devicesRes] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as any;

      setResident(residentRes.data);
      setAppointments(appointmentsRes.data || []);
      setMedications(medicationsRes.data || []);
      setDevices(devicesRes.data || []);
      console.log('[SENIOR_HOME_LOAD] Data load complete');
    } catch (err: any) {
      console.error('[SENIOR_HOME_LOAD] Error:', err);
      if (err.message === 'DATA_LOAD_TIMEOUT') {
        setLoadError('Loading timeout (10s). Database may be slow.');
      } else {
        setLoadError(`Error loading data: ${err.message}`);
      }
    } finally {
      console.log('[SENIOR_HOME_LOAD] Clearing loading state');
      setLoading(false);
    }
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const todayAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.scheduled_at);
    return aptDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter((apt: any) => {
    const aptDate = new Date(apt.scheduled_at);
    return aptDate > today;
  }).slice(0, 3);

  if (loadError) {
    return (
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '64px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '48px',
          color: '#991b1b'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
            Loading Error
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '24px' }}>
            {loadError}
          </p>
          <button
            onClick={() => {
              setLoadError(null);
              setLoading(true);
              loadData();
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            height: '44px',
            width: '300px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px',
            marginBottom: '8px'
          }} />
          <div style={{
            height: '24px',
            width: '200px',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px'
          }} />
        </div>

        <div style={{
          height: '120px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: '16px',
          marginBottom: '24px'
        }} />

        <div style={{
          height: '200px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: '16px',
          marginBottom: '24px'
        }} />

        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '18px',
        lineHeight: '1.6'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 data-testid="resident-name" style={{
              fontSize: '36px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              color: '#1a1a1a'
            }}>
              {greeting}, {resident?.full_name?.split(' ')[0]}
            </h1>
            <p style={{
              fontSize: '20px',
              color: '#666',
              margin: 0
            }}>
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {resident && (
          <SeniorOperatingModeSwitcher residentId={resident.id} />
        )}

        {selectedResidentId && (
          <CareContextProvider residentId={selectedResidentId}>
            <ResidentContextCard />
          </CareContextProvider>
        )}

      <div style={{
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '32px' }}>✓</span>
          <h2 style={{ fontSize: '24px', margin: 0, fontWeight: '600' }}>You're All Set</h2>
        </div>
        <p style={{ fontSize: '18px', margin: 0, opacity: 0.95 }}>
          {todayAppointments.length === 0
            ? 'No appointments today. Enjoy your day!'
            : `You have ${todayAppointments.length} appointment${todayAppointments.length > 1 ? 's' : ''} scheduled for today.`}
        </p>
      </div>

      {selectedResidentId && (
        <div style={{ marginBottom: '32px' }}>
          <CognitiveSnapshot residentId={selectedResidentId} role="SENIOR" />
        </div>
      )}

      {todayAppointments.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1a1a1a'
          }}>
            Today's Appointments
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todayAppointments.map((apt: any) => (
              <div
                key={apt.id}
                style={{
                  background: 'white',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  🏥
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: '#1a1a1a'
                  }}>
                    {apt.title}
                  </div>
                  <div style={{ fontSize: '18px', color: '#666' }}>
                    {formatTime(apt.scheduled_at)}
                    {apt.provider_name && ` • ${apt.provider_name}`}
                    {apt.location && ` • ${apt.location}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingAppointments.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1a1a1a'
          }}>
            Upcoming Appointments
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingAppointments.map((apt: any) => (
              <div
                key={apt.id}
                style={{
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  📅
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: '#1a1a1a'
                  }}>
                    {apt.title}
                  </div>
                  <div style={{ fontSize: '18px', color: '#666' }}>
                    {formatDate(apt.scheduled_at)} at {formatTime(apt.scheduled_at)}
                    {apt.provider_name && ` • ${apt.provider_name}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {medications.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1a1a1a'
          }}>
            My Medications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {medications.slice(0, 4).map((med: any) => (
              <div
                key={med.id}
                style={{
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: '#1a1a1a'
                  }}>
                    {med.medication_name} {med.dosage} {med.dosage_unit}
                  </div>
                  <div style={{ fontSize: '18px', color: '#666' }}>
                    {med.frequency} • {med.scheduled_time}
                    {med.prescribed_by && ` • Prescribed by ${med.prescribed_by}`}
                  </div>
                  {med.instructions && (
                    <div style={{ fontSize: '16px', color: '#9ca3af', marginTop: '4px' }}>
                      {med.instructions}
                    </div>
                  )}
                </div>
                <div style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  ACTIVE
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {devices.length > 0 && (
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1a1a1a'
          }}>
            My Connected Devices
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.map((device: any) => {
              const isLowBattery = device.battery_level && device.battery_level < 20;
              const isOnline = device.trust_state === 'TRUSTED';
              return (
                <div
                  key={device.id}
                  style={{
                    background: 'white',
                    border: `2px solid ${isLowBattery ? '#fbbf24' : isOnline ? '#86efac' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      marginBottom: '4px',
                      color: '#1a1a1a'
                    }}>
                      {device.device_name}
                    </div>
                    <div style={{ fontSize: '18px', color: '#666' }}>
                      {device.manufacturer} {device.model}
                      {device.battery_level && ` • ${device.battery_level}% battery`}
                    </div>
                  </div>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: isOnline ? '#22c55e' : '#ef4444'
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export const SeniorHome: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [resident, setResident] = useState<any>(null);

  useEffect(() => {
    if (selectedResidentId) {
      supabase.from('residents').select('*').eq('id', selectedResidentId).maybeSingle().then(res => {
        if (res.data) setResident(res.data);
      });
    }
  }, [selectedResidentId]);

  return (
    <ShowcaseNavWrapper role="SENIOR">
      {(activeTab) => (
        <>
          {(() => {
            switch (activeTab) {
              case 'home':
                return <SeniorHomeContent />;
              case 'appointments':
                return <SeniorAppointmentsPage />;
              case 'medications':
                return <SeniorMedicationsPage />;
              case 'lab-tests':
                return <SeniorLabTestsPage />;
              case 'care-plan':
                return <SeniorCarePlanPage />;
              case 'care-timeline':
                return <SeniorCareTimeline />;
              case 'care-notes':
                return <SeniorVoiceDocumentationViewer />;
              case 'health':
                return <SeniorHealthInputsPageReal />;
              case 'devices':
                return <SeniorDevicePairingPage />;
              case 'health-dashboard':
                return <SeniorHealthDashboard />;
              case 'documents':
                return <SeniorDocumentsPage />;
              case 'messages':
                return <SeniorMessagingPage />;
              case 'notifications':
                return <SeniorNotificationsPageReal />;
              case 'settings':
                return <SeniorSettingsPageReal />;
              default:
                return <SeniorHomeContent />;
            }
          })()}

          {/* Always-visible SOS button and AI Assistant on all tabs */}
          {resident && (
            <>
              <SeniorSOSButton residentId={resident.id} residentName={resident.full_name} />
              <SeniorAIAssistant residentId={resident.id} residentName={resident.full_name} />
            </>
          )}
        </>
      )}
    </ShowcaseNavWrapper>
  );
};
