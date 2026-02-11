import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SeniorOperatingModeSwitcherProps {
  residentId: string;
}

type OperatingMode = 'SELF_MANAGE' | 'FAMILY_ADMIN';

export const SeniorOperatingModeSwitcher: React.FC<SeniorOperatingModeSwitcherProps> = ({ residentId }) => {
  const [currentMode, setCurrentMode] = useState<OperatingMode>('SELF_MANAGE');
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [targetMode, setTargetMode] = useState<OperatingMode>('SELF_MANAGE');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [residentId]);

  const loadData = async () => {
    // Get current operating mode
    const { data: modeData } = await supabase
      .rpc('get_resident_operating_mode', { p_resident_id: residentId });

    if (modeData) {
      setCurrentMode(modeData);
    }

    // Get family members
    const { data: familyData } = await supabase
      .from('family_resident_links')
      .select(`
        user_id,
        relationship,
        user_profiles!inner(full_name, email)
      `)
      .eq('resident_id', residentId);

    if (familyData) {
      setFamilyMembers(familyData);
    }

    setLoading(false);
  };

  const handleModeChange = (newMode: OperatingMode) => {
    setTargetMode(newMode);
    setShowConfirmation(true);
  };

  const confirmModeChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('set_resident_operating_mode', {
        p_resident_id: residentId,
        p_new_mode: targetMode
      });

      if (error) throw error;

      setCurrentMode(targetMode);
      setShowConfirmation(false);
      alert(`Mode changed to ${targetMode.replace('_', ' ')}`);
    } catch (err) {
      console.error('Error changing mode:', err);
      alert('Failed to change mode');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      border: '2px solid #e5e7eb',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <h2 style={{
        fontSize: '28px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '12px'
      }}>
        Care Management Mode
      </h2>
      <p style={{
        fontSize: '18px',
        color: '#6b7280',
        marginBottom: '24px'
      }}>
        Control who can manage your care
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div
          onClick={() => handleModeChange('SELF_MANAGE')}
          style={{
            padding: '24px',
            borderRadius: '12px',
            border: currentMode === 'SELF_MANAGE' ? '3px solid #3b82f6' : '2px solid #e5e7eb',
            background: currentMode === 'SELF_MANAGE' ? '#eff6ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            fontSize: '48px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            👤
          </div>
          <h3 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1f2937',
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            Self-Manage
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            You have full control. Family can view but not change anything.
          </p>
          {currentMode === 'SELF_MANAGE' && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              ✓ ACTIVE
            </div>
          )}
        </div>

        <div
          onClick={() => handleModeChange('FAMILY_ADMIN')}
          style={{
            padding: '24px',
            borderRadius: '12px',
            border: currentMode === 'FAMILY_ADMIN' ? '3px solid #3b82f6' : '2px solid #e5e7eb',
            background: currentMode === 'FAMILY_ADMIN' ? '#eff6ff' : 'white',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            fontSize: '48px',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            👨‍👩‍👧‍👦
          </div>
          <h3 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1f2937',
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            Family Admin
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            Your family can manage medications, appointments, and messages for you.
          </p>
          {currentMode === 'FAMILY_ADMIN' && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              ✓ ACTIVE
            </div>
          )}
        </div>
      </div>

      {familyMembers.length > 0 && (
        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            Your Family Members
          </h3>
          {familyMembers.map((member: any) => (
            <div
              key={member.user_id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'white',
                borderRadius: '8px',
                marginBottom: '8px'
              }}
            >
              <div>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {member.user_profiles.full_name}
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {member.relationship}
                </p>
              </div>
              <div style={{
                padding: '6px 12px',
                background: currentMode === 'FAMILY_ADMIN' ? '#86efac' : '#e5e7eb',
                color: currentMode === 'FAMILY_ADMIN' ? '#065f46' : '#6b7280',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {currentMode === 'FAMILY_ADMIN' ? 'Can Manage' : 'View Only'}
              </div>
            </div>
          ))}
        </div>
      )}

      {showConfirmation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '16px'
            }}>
              {targetMode === 'SELF_MANAGE' ? 'Take Back Control?' : 'Let Family Help?'}
            </h3>
            <p style={{
              fontSize: '20px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              {targetMode === 'SELF_MANAGE'
                ? 'You will manage your own medications, appointments, and messages. Your family can still view your information.'
                : 'Your family members will be able to manage medications, schedule appointments, and communicate with your care team on your behalf.'
              }
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={confirmModeChange}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '20px',
                  fontWeight: '700',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? 'Changing...' : 'Yes, Change Mode'}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '20px',
                  fontWeight: '700',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
