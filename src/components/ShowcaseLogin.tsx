import { useState } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import type { ShowcaseRole } from '../config/showcase';

export function ShowcaseLogin() {
  const { login } = useShowcase();
  const [selectedRole, setSelectedRole] = useState<ShowcaseRole>('CAREGIVER');

  const handleLogin = async () => {
    await login(selectedRole);
  };

  const roles: { value: ShowcaseRole; label: string; description: string }[] = [
    {
      value: 'AGENCY_ADMIN',
      label: 'Agency Administrator',
      description: 'Full access to agency settings, compliance, and management'
    },
    {
      value: 'SUPERVISOR',
      label: 'Supervisor',
      description: 'Manage scheduling, assignments, and oversee care operations'
    },
    {
      value: 'CAREGIVER',
      label: 'Caregiver',
      description: 'Deliver care, administer medications, document activities'
    },
    {
      value: 'SENIOR',
      label: 'Senior Resident',
      description: 'View your own care schedule, medications, and preferences'
    },
    {
      value: 'FAMILY_VIEWER',
      label: 'Family Member',
      description: 'View updates and care information for your loved one'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: '48px',
        width: '100%',
        maxWidth: '500px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            marginBottom: '16px'
          }}>
            SHOWCASE MODE
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 8px 0'
          }}>
            Welcome to Demo Care Agency
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0
          }}>
            Select a role to explore the platform
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            color: '#334155',
            marginBottom: '12px'
          }}>
            Login As
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {roles.map((role) => (
              <label
                key={role.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '16px',
                  border: selectedRole === role.value ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedRole === role.value ? '#eff6ff' : '#fff',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value as ShowcaseRole)}
                  style={{ marginTop: '2px', marginRight: '12px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: '4px'
                  }}>
                    {role.label}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#64748b',
                    lineHeight: '1.4'
                  }}>
                    {role.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          Login to Showcase
        </button>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#92400e',
            lineHeight: '1.5'
          }}>
            <strong>Note:</strong> This is a simulated environment with sample data. No real authentication or database calls are made. All actions are simulated in-memory only.
          </div>
        </div>
      </div>
    </div>
  );
}
