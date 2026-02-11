import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface CarePlanAnchor {
  id: string;
  resident_id: string;
  domain: string;
  goal: string;
  interventions: string[];
  target_date: string | null;
  status: 'ACTIVE' | 'ACHIEVED' | 'REVISED' | 'DISCONTINUED';
  progress_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const SeniorCarePlanPage: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [carePlans, setCarePlans] = useState<CarePlanAnchor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (selectedResidentId) {
      loadCarePlans();
    }
  }, [selectedResidentId]);

  const loadCarePlans = async () => {
    if (!selectedResidentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resident_care_plan_anchors')
        .select('*')
        .eq('resident_id', selectedResidentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCarePlans(data || []);
    } catch (err) {
      console.error('Error loading care plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'No target date';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#3b82f6';
      case 'ACHIEVED': return '#10b981';
      case 'REVISED': return '#f59e0b';
      case 'DISCONTINUED': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getDomainIcon = (domain: string) => {
    const icons: Record<string, string> = {
      'MOBILITY': '🚶',
      'NUTRITION': '🍽️',
      'MEDICATION': '💊',
      'COGNITIVE': '🧠',
      'SOCIAL': '👥',
      'PAIN': '🩹',
      'SAFETY': '🛡️',
      'HYGIENE': '🧼',
      'EMOTIONAL': '❤️',
      'SPIRITUAL': '🙏'
    };
    return icons[domain] || '📋';
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading care plan...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '900px',
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
          My Care Plan
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          Your personalized care goals and how we're working together to achieve them
        </p>
      </div>

      {carePlans.length === 0 ? (
        <div style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
            No care plan created yet
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            Your care team will work with you to create a personalized care plan
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {carePlans.map(plan => (
            <div
              key={plan.id}
              style={{
                background: 'white',
                border: `2px solid ${selectedPlan === plan.id ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '32px', marginRight: '12px' }}>
                      {getDomainIcon(plan.domain)}
                    </span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>
                        {plan.domain}
                      </div>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        margin: 0,
                        color: '#1a1a1a'
                      }}>
                        {plan.goal}
                      </h3>
                    </div>
                  </div>
                </div>
                <span style={{
                  background: getStatusColor(plan.status),
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginLeft: '16px',
                  flexShrink: 0
                }}>
                  {plan.status}
                </span>
              </div>

              <div style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
                📅 Target Date: {formatDate(plan.target_date)}
              </div>

              {selectedPlan === plan.id && (
                <div style={{
                  paddingTop: '20px',
                  borderTop: '2px solid #e5e7eb'
                }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#1a1a1a'
                  }}>
                    How we're helping you:
                  </h4>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '24px',
                    fontSize: '16px',
                    lineHeight: '1.8',
                    color: '#374151'
                  }}>
                    {plan.interventions.map((intervention, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>
                        {intervention}
                      </li>
                    ))}
                  </ul>

                  {plan.progress_notes && (
                    <div style={{
                      marginTop: '20px',
                      background: '#f9fafb',
                      padding: '16px',
                      borderRadius: '8px'
                    }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#1a1a1a'
                      }}>
                        Progress Notes:
                      </h4>
                      <p style={{
                        fontSize: '16px',
                        lineHeight: '1.6',
                        color: '#374151',
                        margin: 0
                      }}>
                        {plan.progress_notes}
                      </p>
                    </div>
                  )}

                  <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '16px' }}>
                    Last updated: {formatDate(plan.updated_at)}
                  </div>
                </div>
              )}

              {selectedPlan !== plan.id && (
                <div style={{
                  fontSize: '14px',
                  color: '#3b82f6',
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: '8px'
                }}>
                  Click to view details ↓
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
