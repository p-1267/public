import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface EmergencyContact {
  id: string;
  resident_id: string;
  contact_name: string;
  relationship: string;
  phone_primary: string;
  phone_secondary: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  call_order: number;
  notes: string | null;
  created_at: string;
}

export const SeniorEmergencyContactsPanel: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (selectedResidentId) {
      loadContacts();
    }
  }, [selectedResidentId]);

  const loadContacts = async () => {
    if (!selectedResidentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resident_emergency_contacts')
        .select('*')
        .eq('resident_id', selectedResidentId)
        .order('call_order', { ascending: true });

      if (error) throw error;

      setContacts(data || []);
    } catch (err) {
      console.error('Error loading emergency contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading contacts...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          margin: 0,
          color: '#1a1a1a'
        }}>
          Emergency Contacts
        </h3>
        <button
          onClick={() => setEditing(!editing)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            border: '2px solid #3b82f6',
            background: editing ? '#3b82f6' : 'white',
            color: editing ? 'white' : '#3b82f6',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {contacts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px',
          color: '#666'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📞</div>
          <div style={{ fontSize: '16px' }}>No emergency contacts configured</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {contacts.map((contact, idx) => (
            <div
              key={contact.id}
              style={{
                border: contact.is_primary ? '2px solid #ef4444' : '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                background: contact.is_primary ? '#fef2f2' : '#f9fafb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                    {contact.contact_name}
                    {contact.is_primary && (
                      <span style={{
                        marginLeft: '8px',
                        background: '#ef4444',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {contact.relationship}
                  </div>
                </div>
                <div style={{
                  background: '#e5e7eb',
                  color: '#374151',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  Call Order: {contact.call_order}
                </div>
              </div>

              <div style={{ fontSize: '16px', color: '#374151', marginTop: '12px' }}>
                <div style={{ marginBottom: '6px' }}>
                  📞 <strong>Primary Phone:</strong> {contact.phone_primary}
                </div>
                {contact.phone_secondary && (
                  <div style={{ marginBottom: '6px' }}>
                    📱 <strong>Secondary:</strong> {contact.phone_secondary}
                  </div>
                )}
                {contact.email && (
                  <div style={{ marginBottom: '6px' }}>
                    ✉️ <strong>Email:</strong> {contact.email}
                  </div>
                )}
                {contact.address && (
                  <div style={{ marginBottom: '6px' }}>
                    🏠 <strong>Address:</strong> {contact.address}
                  </div>
                )}
              </div>

              {contact.notes && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <strong>Notes:</strong> {contact.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#92400e'
      }}>
        <strong>⚠️ Important:</strong> These contacts will be called in order during an emergency. Keep this information up-to-date.
      </div>
    </div>
  );
};
