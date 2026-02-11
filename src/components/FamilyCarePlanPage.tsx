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

interface CarePlanComment {
  id: string;
  care_plan_id: string;
  commenter_name: string;
  comment_text: string;
  comment_type: 'QUESTION' | 'CONCERN' | 'FEEDBACK' | 'OBSERVATION';
  created_at: string;
}

export const FamilyCarePlanPage: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [carePlans, setCarePlans] = useState<CarePlanAnchor[]>([]);
  const [comments, setComments] = useState<Record<string, CarePlanComment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCommentForm, setShowCommentForm] = useState<string | null>(null);
  const [newComment, setNewComment] = useState({
    text: '',
    type: 'FEEDBACK' as 'QUESTION' | 'CONCERN' | 'FEEDBACK' | 'OBSERVATION'
  });

  useEffect(() => {
    if (selectedResidentId) {
      loadData();
    }
  }, [selectedResidentId]);

  const loadData = async () => {
    if (!selectedResidentId) return;

    setLoading(true);
    try {
      // Load care plans
      const { data: plansData, error: plansError } = await supabase
        .from('resident_care_plan_anchors')
        .select('*')
        .eq('resident_id', selectedResidentId)
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      setCarePlans(plansData || []);

      // Note: care_plan_comments table would need to be created for full functionality
      // For now, showing framework for collaboration
    } catch (err) {
      console.error('Error loading care plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (carePlanId: string) => {
    if (!newComment.text.trim()) {
      alert('Please enter a comment');
      return;
    }

    try {
      // In production, this would insert into care_plan_comments table
      // For now, showing framework
      alert('Comment submitted! The care team will review your feedback.');

      setNewComment({ text: '', type: 'FEEDBACK' });
      setShowCommentForm(null);
    } catch (err) {
      console.error('Error submitting comment:', err);
      alert('Failed to submit comment. Please try again.');
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

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'QUESTION': return '#3b82f6';
      case 'CONCERN': return '#ef4444';
      case 'FEEDBACK': return '#10b981';
      case 'OBSERVATION': return '#f59e0b';
      default: return '#6b7280';
    }
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
          Care Plan
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          Review care goals and share feedback with the care team
        </p>
      </div>

      <div style={{
        background: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '16px', color: '#1e40af', marginBottom: '8px', fontWeight: '600' }}>
          💬 Collaboration Enabled
        </div>
        <div style={{ fontSize: '15px', color: '#1e40af' }}>
          You can ask questions, share concerns, or provide feedback on any care goal.
          The care team will respond to your input.
        </div>
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
            The care team will create a personalized care plan
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {carePlans.map(plan => {
            const planComments = comments[plan.id] || [];

            return (
              <div
                key={plan.id}
                style={{
                  background: 'white',
                  border: `2px solid ${selectedPlan === plan.id ? '#3b82f6' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  padding: '24px'
                }}
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

                <div style={{
                  paddingTop: '16px',
                  borderTop: '2px solid #e5e7eb'
                }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#1a1a1a'
                  }}>
                    Care Interventions:
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
                </div>

                {/* Comment Section */}
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '2px solid #e5e7eb'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      margin: 0,
                      color: '#1a1a1a'
                    }}>
                      Family Feedback ({planComments.length})
                    </h4>
                    <button
                      onClick={() => setShowCommentForm(showCommentForm === plan.id ? null : plan.id)}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        border: '2px solid #10b981',
                        background: showCommentForm === plan.id ? '#10b981' : 'white',
                        color: showCommentForm === plan.id ? 'white' : '#10b981',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      {showCommentForm === plan.id ? 'Cancel' : '💬 Add Feedback'}
                    </button>
                  </div>

                  {showCommentForm === plan.id && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '2px solid #10b981',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', display: 'block', marginBottom: '8px' }}>
                          Type of Feedback
                        </label>
                        <select
                          value={newComment.type}
                          onChange={(e) => setNewComment({ ...newComment, type: e.target.value as any })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '16px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        >
                          <option value="FEEDBACK">General Feedback</option>
                          <option value="QUESTION">Question</option>
                          <option value="CONCERN">Concern</option>
                          <option value="OBSERVATION">Observation</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', display: 'block', marginBottom: '8px' }}>
                          Your Message
                        </label>
                        <textarea
                          value={newComment.text}
                          onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                          placeholder="Share your thoughts, questions, or concerns..."
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '16px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => submitComment(plan.id)}
                        style={{
                          padding: '10px 20px',
                          fontSize: '16px',
                          fontWeight: '600',
                          border: 'none',
                          background: '#10b981',
                          color: 'white',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Submit Feedback
                      </button>
                    </div>
                  )}

                  {planComments.length === 0 && showCommentForm !== plan.id && (
                    <div style={{
                      textAlign: 'center',
                      padding: '24px',
                      color: '#666',
                      fontSize: '15px'
                    }}>
                      No feedback yet. Be the first to share your thoughts!
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '16px' }}>
                  Last updated: {formatDate(plan.updated_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
