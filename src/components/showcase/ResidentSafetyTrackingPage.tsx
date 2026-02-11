import React, { useState, useEffect } from 'react';
import { useShowcase } from '../../contexts/ShowcaseContext';
import { supabase } from '../../lib/supabase';

interface ResidentSafetyTrackingPageProps {
  residentName?: string;
}

interface SafetyData {
  presenceState: string;
  lastKnownLocation: string;
  lastMovement: string;
  safeZoneStatus: string;
  batteryLevel: number;
  deviceStatus: string;
}

interface LocationEntry {
  time: string;
  location: string;
  duration: string;
}

interface FallEvent {
  time: string;
  confidence: number;
  verified: string;
  notes: string;
}

export const ResidentSafetyTrackingPage: React.FC<ResidentSafetyTrackingPageProps> = ({ residentName }) => {
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [loading, setLoading] = useState(true);
  const [safetyData, setSafetyData] = useState<SafetyData>({
    presenceState: 'SAFE',
    lastKnownLocation: 'Unknown',
    lastMovement: 'Never',
    safeZoneStatus: 'INSIDE',
    batteryLevel: 0,
    deviceStatus: 'OFFLINE',
  });
  const [locationHistory, setLocationHistory] = useState<LocationEntry[]>([]);
  const [fallEvents, setFallEvents] = useState<FallEvent[]>([]);
  const [displayName, setDisplayName] = useState(residentName || 'Resident');

  useEffect(() => {
    loadSafetyData();
  }, [selectedResidentId]);

  const loadSafetyData = async () => {
    setLoading(true);
    try {
      let residentId = selectedResidentId;

      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: links } = await supabase
          .from('family_resident_links')
          .select('resident_id, residents!inner(full_name)')
          .eq('family_user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!links) {
          setLoading(false);
          return;
        }
        residentId = links.resident_id;
        setDisplayName((links.residents as any).full_name);
      } else if (residentId) {
        const { data: resident } = await supabase
          .from('residents')
          .select('full_name')
          .eq('id', residentId)
          .maybeSingle();

        if (resident) {
          setDisplayName(resident.full_name);
        }
      }

      if (!residentId) {
        setLoading(false);
        return;
      }

      const { data: devices } = await supabase
        .from('device_registry')
        .select('*')
        .eq('resident_id', residentId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const { data: signals } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('resident_id', residentId)
        .eq('category', 'LOCATION')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: fallSignals } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('resident_id', residentId)
        .eq('category', 'SAFETY')
        .contains('metadata', { type: 'fall_detection' })
        .order('created_at', { ascending: false })
        .limit(5);

      if (devices) {
        const lastSeen = devices.last_seen_at ? new Date(devices.last_seen_at) : null;
        const minutesAgo = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 60000) : null;

        setSafetyData({
          presenceState: devices.health_status === 'HEALTHY' ? 'SAFE' : 'CHECK_NEEDED',
          lastKnownLocation: devices.metadata?.last_location || 'Unknown',
          lastMovement: minutesAgo !== null ? (minutesAgo < 60 ? `${minutesAgo} minutes ago` : `${Math.floor(minutesAgo / 60)} hours ago`) : 'Never',
          safeZoneStatus: 'INSIDE',
          batteryLevel: devices.metadata?.battery_level || 0,
          deviceStatus: devices.is_active && minutesAgo !== null && minutesAgo < 15 ? 'ONLINE' : 'OFFLINE',
        });
      }

      if (signals && signals.length > 0) {
        setLocationHistory(signals.map(signal => ({
          time: new Date(signal.created_at).toLocaleTimeString(),
          location: signal.metadata?.location || 'Unknown',
          duration: signal.metadata?.duration || 'Unknown'
        })));
      }

      if (fallSignals && fallSignals.length > 0) {
        setFallEvents(fallSignals.map(signal => ({
          time: new Date(signal.created_at).toLocaleString(),
          confidence: signal.metadata?.confidence || 0,
          verified: signal.metadata?.verified || 'PENDING',
          notes: signal.title || 'No notes'
        })));
      }

    } catch (err) {
      console.error('Failed to load safety data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-2xl text-gray-600">Loading safety data...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '1000px',
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
          SHOWCASE MODE — Simulated Tracking Data
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
            {displayName} - Safety & Tracking
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
          }}>
            Real-time location tracking and safety monitoring
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #10b981',
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Presence State
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
              {safetyData.presenceState}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Last Movement
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>
              {safetyData.lastMovement}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: safetyData.safeZoneStatus === 'INSIDE' ? '4px solid #10b981' : '4px solid #f59e0b',
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Safe Zone
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: safetyData.safeZoneStatus === 'INSIDE' ? '#10b981' : '#f59e0b' }}>
              {safetyData.safeZoneStatus}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Device Status
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>
              {safetyData.deviceStatus} • {safetyData.batteryLevel}%
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#0f172a',
          }}>
            Current Location
          </h2>
          <div style={{
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '48px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📍</div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              {safetyData.lastKnownLocation}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Last updated: {safetyData.lastMovement}
            </div>
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1e40af',
          }}>
            In production, this would show an interactive floor plan with real-time positioning using BLE beacons or GPS.
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#0f172a',
          }}>
            Location History (Last 2 Hours)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {locationHistory.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {entry.location}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Duration: {entry.duration}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {entry.time}
                </div>
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
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: '#0f172a',
          }}>
            Fall Detection Events
          </h2>
          {fallEvents.map((event, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                backgroundColor: event.verified === 'FALSE_ALARM' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${event.verified === 'FALSE_ALARM' ? '#86efac' : '#fecaca'}`,
                borderRadius: '8px',
                marginBottom: '12px',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  Potential Fall Detected
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {event.time}
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#334155', marginBottom: '8px' }}>
                Confidence: {event.confidence}% • Status: <strong>{event.verified}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {event.notes}
              </div>
            </div>
          ))}
          <div style={{
            padding: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1e40af',
            marginTop: '12px',
          }}>
            In production, fall detection uses accelerometer data from wearable devices. When confidence exceeds 70%, an automatic alert is sent to caregivers.
          </div>
        </div>
      </div>
    </div>
  );
};
