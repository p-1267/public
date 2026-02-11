import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcase } from '../../contexts/ShowcaseContext';

export const SupervisorResidentsPage: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setResidents(data || []);
    } catch (err) {
      console.error('Error loading residents:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading residents...</div>
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
          margin: '0 0 16px 0',
          color: '#1a1a1a'
        }}>
          All Residents
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          Overview of all residents in your care
        </p>
      </div>

      {residents.length === 0 ? (
        <div style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
            No residents found
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            Residents will appear here once added to the system
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {residents.map(resident => (
            <div
              key={resident.id}
              style={{
                background: 'white',
                border: resident.id === selectedResidentId ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  marginRight: '16px'
                }}>
                  {resident.full_name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    margin: '0 0 4px 0',
                    color: '#1a1a1a'
                  }}>
                    {resident.full_name}
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Room {resident.room_number || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{
                paddingTop: '12px',
                borderTop: '2px solid #e5e7eb',
                fontSize: '14px',
                color: '#666'
              }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>DOB:</strong> {resident.date_of_birth ? new Date(resident.date_of_birth).toLocaleDateString() : 'N/A'}
                </div>
                <div>
                  <strong>Care Level:</strong> {resident.care_level || 'Standard'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
