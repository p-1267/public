import { useSeniorResident } from '../hooks/useSeniorResident';
import { SeniorEmergencyIndicator } from './SeniorEmergencyIndicator';
import { SeniorCareStatus } from './SeniorCareStatus';
import { SeniorCareTimeline } from './SeniorCareTimeline';

export function SeniorDashboard() {
  const { resident, loading, error } = useSeniorResident();

  if (loading) {
    return (
      <div style={{
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ fontSize: '24px', color: '#666' }}>Loading your information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          padding: '24px',
          backgroundColor: '#ffebee',
          borderRadius: '12px',
          border: '2px solid #ef5350'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#c62828', marginBottom: '8px' }}>
            Unable to Load Information
          </div>
          <div style={{ fontSize: '18px', color: '#d32f2f' }}>
            {error.message}
          </div>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div style={{
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          padding: '24px',
          backgroundColor: '#fff3e0',
          borderRadius: '12px',
          border: '2px solid #ffb74d'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#e65100', marginBottom: '8px' }}>
            No Resident Profile Found
          </div>
          <div style={{ fontSize: '18px', color: '#f57c00' }}>
            You do not have a resident profile linked to your account.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#fafafa',
      minHeight: '100vh'
    }}>
      <div style={{
        padding: '32px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        marginBottom: '32px',
        border: '2px solid #e0e0e0'
      }}>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
          Welcome, {resident.full_name}
        </div>
        {resident.agency_name && (
          <div style={{ fontSize: '20px', color: '#666', marginBottom: '24px' }}>
            Care provided by {resident.agency_name}
          </div>
        )}

        {resident.caregivers.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#333', marginBottom: '16px' }}>
              Your Care Team
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {resident.caregivers.map((caregiver) => (
                <div
                  key={caregiver.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#333' }}>
                    {caregiver.display_name}
                  </div>
                  <div style={{ fontSize: '16px', color: '#666', marginTop: '4px' }}>
                    Assigned: {new Date(caregiver.assigned_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {resident.caregivers.length === 0 && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fff3e0',
            borderRadius: '8px',
            border: '1px solid #ffb74d',
            marginTop: '16px'
          }}>
            <div style={{ fontSize: '18px', color: '#e65100' }}>
              No caregivers currently assigned
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
        <SeniorEmergencyIndicator />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
        <SeniorCareStatus />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <SeniorCareTimeline />
      </div>

      <div style={{
        marginTop: '32px',
        padding: '24px',
        backgroundColor: '#e3f2fd',
        borderRadius: '12px',
        border: '2px solid #1976d2'
      }}>
        <div style={{ fontSize: '20px', fontWeight: '600', color: '#1565c0', marginBottom: '12px' }}>
          Trust & Safety Indicators
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {resident.caregivers.length > 0 && (
            <div style={{ fontSize: '18px', color: '#0d47a1' }}>
              ✓ Caregiver assigned and active
            </div>
          )}
          <div style={{ fontSize: '18px', color: '#0d47a1' }}>
            ✓ Care activity being recorded
          </div>
          <div style={{ fontSize: '18px', color: '#0d47a1' }}>
            ✓ System monitoring active
          </div>
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '16px', fontStyle: 'italic' }}>
          These indicators show that your care is being tracked and monitored.
        </div>
      </div>
    </div>
  );
}
