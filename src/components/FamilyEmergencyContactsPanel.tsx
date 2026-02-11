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

interface ContactFormData {
  contact_name: string;
  relationship: string;
  phone_primary: string;
  phone_secondary: string;
  email: string;
  is_primary: boolean;
  contact_order: number;
  notes: string;
}

export const FamilyEmergencyContactsPanel: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    contact_name: '',
    relationship: '',
    phone_primary: '',
    phone_secondary: '',
    email: '',
    is_primary: false,
    contact_order: 1,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

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

  const saveContact = async () => {
    if (!selectedResidentId) return;
    if (!formData.contact_name || !formData.relationship || !formData.phone_primary) {
      alert('Please fill in all required fields (Name, Relationship, Primary Phone)');
      return;
    }

    setSaving(true);
    try {
      const contactData = {
        resident_id: selectedResidentId,
        contact_name: formData.contact_name,
        relationship: formData.relationship,
        phone_primary: formData.phone_primary,
        phone_secondary: formData.phone_secondary || null,
        email: formData.email || null,
        is_primary: formData.is_primary,
        contact_order: formData.contact_order,
        notes: formData.notes || null,
        entered_by: null
      };

      if (editingId) {
        // Update existing contact
        const { error } = await supabase
          .from('resident_emergency_contacts')
          .update(contactData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Create new contact
        const { error } = await supabase
          .from('resident_emergency_contacts')
          .insert([contactData]);

        if (error) throw error;
      }

      // Reset form and reload
      resetForm();
      loadContacts();
    } catch (err) {
      console.error('Error saving contact:', err);
      alert('Failed to save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const editContact = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setShowAddForm(true);
    setFormData({
      contact_name: contact.contact_name,
      relationship: contact.relationship,
      phone_primary: contact.phone_primary,
      phone_secondary: contact.phone_secondary || '',
      email: contact.email || '',
      is_primary: contact.is_primary,
      contact_order: contact.call_order,
      notes: contact.notes || ''
    });
  };

  const resetForm = () => {
    setFormData({
      contact_name: '',
      relationship: '',
      phone_primary: '',
      phone_secondary: '',
      email: '',
      is_primary: false,
      contact_order: contacts.length + 1,
      notes: ''
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resident_emergency_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      loadContacts();
    } catch (err) {
      console.error('Error deleting contact:', err);
      alert('Failed to delete contact. Please try again.');
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
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            border: '2px solid #10b981',
            background: showAddForm ? '#10b981' : 'white',
            color: showAddForm ? 'white' : '#10b981',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Contact'}
        </button>
      </div>

      {showAddForm && (
        <div style={{
          background: '#f0fdf4',
          border: '2px solid #10b981',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1a1a1a' }}>
            {editingId ? 'Edit Emergency Contact' : 'Add New Emergency Contact'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                Contact Name *
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '15px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="John Doe"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                Relationship *
              </label>
              <input
                type="text"
                value={formData.relationship}
                onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '15px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="Daughter"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                Primary Phone *
              </label>
              <input
                type="tel"
                value={formData.phone_primary}
                onChange={(e) => setFormData({...formData, phone_primary: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '15px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                Secondary Phone
              </label>
              <input
                type="tel"
                value={formData.phone_secondary}
                onChange={(e) => setFormData({...formData, phone_secondary: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '15px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px'
                }}
                placeholder="(555) 987-6543"
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '15px',
                border: '2px solid #d1d5db',
                borderRadius: '6px'
              }}
              placeholder="john.doe@example.com"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="is_primary"
                checked={formData.is_primary}
                onChange={(e) => setFormData({...formData, is_primary: e.target.checked})}
                style={{ width: '20px', height: '20px' }}
              />
              <label htmlFor="is_primary" style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                Primary Contact
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
                Call Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.contact_order}
                onChange={(e) => setFormData({...formData, contact_order: parseInt(e.target.value) || 1})}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '15px',
                  border: '2px solid #d1d5db',
                  borderRadius: '6px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '15px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontFamily: 'inherit'
              }}
              placeholder="Additional notes or special instructions..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={saveContact}
              disabled={saving}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                background: saving ? '#9ca3af' : '#10b981',
                color: 'white',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : editingId ? 'Update Contact' : 'Add Contact'}
            </button>
            <button
              onClick={resetForm}
              disabled={saving}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                border: '2px solid #d1d5db',
                background: 'white',
                color: '#374151',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
                <div style={{ flex: 1 }}>
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
                <div style={{ display: 'flex', gap: '8px' }}>
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
                  <button
                    onClick={() => editContact(contact)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '2px solid #3b82f6',
                      background: 'white',
                      color: '#3b82f6',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteContact(contact.id)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      border: '2px solid #ef4444',
                      background: 'white',
                      color: '#ef4444',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '16px', color: '#374151', marginTop: '12px' }}>
                <div style={{ marginBottom: '6px' }}>
                  📞 <strong>Primary Phone:</strong>{' '}
                  <a href={`tel:${contact.phone_primary}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                    {contact.phone_primary}
                  </a>
                </div>
                {contact.phone_secondary && (
                  <div style={{ marginBottom: '6px' }}>
                    📱 <strong>Secondary:</strong>{' '}
                    <a href={`tel:${contact.phone_secondary}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      {contact.phone_secondary}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div style={{ marginBottom: '6px' }}>
                    ✉️ <strong>Email:</strong>{' '}
                    <a href={`mailto:${contact.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                      {contact.email}
                    </a>
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
        <strong>⚠️ Important:</strong> These contacts will be called in order during an emergency.
        Contact your care team if any information needs to be updated.
      </div>
    </div>
  );
};
