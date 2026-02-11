import React, { useState } from 'react';

export const DeviceManagementPage: React.FC = () => {
  const [isPairing, setIsPairing] = useState(false);

  const devices = [
    {
      id: '1',
      name: 'Fall Detection Pendant',
      type: 'FALL_SENSOR',
      resident: 'Pat Anderson',
      status: 'ONLINE',
      battery: 78,
      lastPing: '2 min ago',
      signals: 'Good',
    },
    {
      id: '2',
      name: 'Blood Pressure Cuff',
      type: 'BP_MONITOR',
      resident: 'Pat Anderson',
      status: 'ONLINE',
      battery: 15,
      lastPing: '5 min ago',
      signals: 'Weak',
    },
    {
      id: '3',
      name: 'Motion Sensor - Bedroom',
      type: 'MOTION',
      resident: 'Robert Chen',
      status: 'OFFLINE',
      battery: 0,
      lastPing: '2 hours ago',
      signals: 'None',
    },
    {
      id: '4',
      name: 'Smart Watch',
      type: 'WEARABLE',
      resident: 'Maria Garcia',
      status: 'ONLINE',
      battery: 92,
      lastPing: '30 sec ago',
      signals: 'Excellent',
    },
  ];

  const handlePairDevice = () => {
    setIsPairing(true);
    setTimeout(() => {
      setIsPairing(false);
      alert('✓ Device Paired Successfully\n\nFall Detection Pendant #5 has been paired and assigned.\n\n(Showcase Mode: simulated BLE pairing)');
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return '#10b981';
      case 'OFFLINE': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery < 20) return '#ef4444';
    if (battery < 50) return '#f59e0b';
    return '#10b981';
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
          SHOWCASE MODE — Simulated Bluetooth & Device Management
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
            Device Management Center
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
          }}>
            Manage Bluetooth devices, monitor battery levels, and track connectivity status.
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
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Total Devices
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
              {devices.length}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Online
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
              {devices.filter(d => d.status === 'ONLINE').length}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Low Battery
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>
              {devices.filter(d => d.battery < 20 && d.battery > 0).length}
            </div>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Offline
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>
              {devices.filter(d => d.status === 'OFFLINE').length}
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
            Pair New Device
          </h2>
          <div style={{
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              color: '#64748b',
            }}>
              Put your device in pairing mode, then click the button below to scan for nearby Bluetooth devices.
            </p>
            <button
              onClick={handlePairDevice}
              disabled={isPairing}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: isPairing ? '#94a3b8' : '#0f172a',
                border: 'none',
                borderRadius: '8px',
                cursor: isPairing ? 'not-allowed' : 'pointer',
              }}
            >
              {isPairing ? 'Scanning for devices...' : '🔍 Scan for Devices'}
            </button>
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1e40af',
          }}>
            In production, this uses Web Bluetooth API to discover and pair BLE devices. Supported devices: fall sensors, BP monitors, glucose meters, smart watches.
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
            Connected Devices
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.map((device) => (
              <div
                key={device.id}
                style={{
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: device.status === 'OFFLINE' ? '2px solid #fecaca' : device.battery < 20 ? '2px solid #fed7aa' : '2px solid #e2e8f0',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                }}>
                  <div>
                    <h3 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}>
                      {device.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {device.type} • Assigned to: <strong>{device.resident}</strong>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(device.status),
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: getStatusColor(device.status),
                    }}>
                      {device.status}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '16px',
                  marginBottom: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Battery
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: getBatteryColor(device.battery),
                    }}>
                      {device.battery > 0 ? `${device.battery}%` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Last Ping
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {device.lastPing}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      Signal
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                      {device.signals}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => alert(`Would show detailed telemetry for ${device.name}\n\n(Showcase Mode: simulated)`)}
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
                    View Telemetry
                  </button>
                  <button
                    onClick={() => alert(`Would reassign ${device.name} to a different resident\n\n(Showcase Mode: simulated)`)}
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
                    Reassign
                  </button>
                  <button
                    onClick={() => alert(`Would unpair ${device.name} from the system\n\n(Showcase Mode: simulated)`)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#dc2626',
                      backgroundColor: '#ffffff',
                      border: '1px solid #dc2626',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Unpair
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
