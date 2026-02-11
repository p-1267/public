import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';

interface SeniorAIAssistantProps {
  residentId: string;
  residentName: string;
}

interface ActionIntent {
  type: 'appointment' | 'medication' | 'message' | 'symptom' | 'summary';
  confidence: number;
  data: any;
}

interface AIReminder {
  id: string;
  type: 'MEDICATION' | 'HYDRATION' | 'ACTIVITY' | 'HEALTH_CHECK';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  message: string;
  reasoning: string;
  dueAt: string;
  actions?: { label: string; handler: () => void }[];
}

interface HealthCoaching {
  id: string;
  category: 'SLEEP' | 'ACTIVITY' | 'NUTRITION' | 'MEDICATION_ADHERENCE';
  insight: string;
  suggestion: string;
  aiReasoning: string;
}

export const SeniorAIAssistant: React.FC<SeniorAIAssistantProps> = ({ residentId, residentName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<ActionIntent | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [aiReminders, setAiReminders] = useState<AIReminder[]>([]);
  const [healthCoaching, setHealthCoaching] = useState<HealthCoaching[]>([]);
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>('large');

  useEffect(() => {
    if (isOpen) {
      loadDailySummary();
      loadAIReminders();
      loadHealthCoaching();
    }
  }, [isOpen]);

  const loadDailySummary = async () => {
    // Load today's appointments and medications
    const today = new Date().toISOString().split('T')[0];

    const [aptsRes, medsRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .eq('resident_id', residentId)
        .gte('scheduled_at', today)
        .lte('scheduled_at', `${today}T23:59:59`)
        .order('scheduled_at'),
      supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', residentId)
        .eq('status', 'ACTIVE')
    ]);

    setDailySummary({
      appointments: aptsRes.data || [],
      medications: medsRes.data || [],
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    });
  };

  const loadAIReminders = () => {
    const mockReminders: AIReminder[] = [
      {
        id: '1',
        type: 'MEDICATION',
        priority: 'HIGH',
        title: 'Evening Medication Time',
        message: 'It\'s 6:00 PM - time for your evening medications',
        reasoning: 'AI detected your medication schedule shows 3 medications due at 6 PM. Based on your routine, you usually take them after dinner.',
        dueAt: new Date().toISOString(),
        actions: [
          { label: 'Took It', handler: () => alert('Medication marked as taken') },
          { label: 'Remind in 30 min', handler: () => alert('Reminder set for 30 minutes') }
        ]
      },
      {
        id: '2',
        type: 'HYDRATION',
        priority: 'MEDIUM',
        title: 'Drink Some Water',
        message: 'You haven\'t had water in 3 hours. Time for a glass!',
        reasoning: 'AI tracks your hydration patterns. You typically feel better when you drink water every 2-3 hours.',
        dueAt: new Date().toISOString()
      },
      {
        id: '3',
        type: 'ACTIVITY',
        priority: 'LOW',
        title: 'Gentle Movement',
        message: 'You\'ve been sitting for 90 minutes. A short walk would help.',
        reasoning: 'Movement every 90 minutes helps circulation and reduces stiffness, especially given your arthritis.',
        dueAt: new Date().toISOString()
      }
    ];
    setAiReminders(mockReminders);
  };

  const loadHealthCoaching = () => {
    const mockCoaching: HealthCoaching[] = [
      {
        id: '1',
        category: 'MEDICATION_ADHERENCE',
        insight: 'Perfect medication streak!',
        suggestion: 'You\'ve taken all medications on time for 7 days. Keep up this excellent routine!',
        aiReasoning: 'AI analyzed your medication log and found 100% adherence over the past week. This consistency leads to better health outcomes.'
      },
      {
        id: '2',
        category: 'SLEEP',
        insight: 'Your sleep improved this week',
        suggestion: 'You\'re averaging 7 hours of sleep, up from 5.5 hours last week. Great progress!',
        aiReasoning: 'AI tracked your sleep duration and quality. The improvement correlates with taking medications earlier in the evening.'
      },
      {
        id: '3',
        category: 'ACTIVITY',
        insight: 'Daily steps are increasing',
        suggestion: 'You\'re walking 2,800 steps daily, up 22% from last month. Try for 3,000 next week!',
        aiReasoning: 'AI monitors your activity patterns. Gradual increases reduce injury risk while building endurance.'
      }
    ];
    setHealthCoaching(mockCoaching);
  };

  const startListening = () => {
    setIsListening(true);
    setTranscript('');
    setIntent(null);

    // Simulate voice recognition (in production, use Web Speech API)
    setTimeout(() => {
      const samplePhrases = [
        "I need to see my doctor next week",
        "I have a headache and feel dizzy",
        "Can you remind me to take my medication at 8 AM",
        "I want to message my doctor about my blood pressure",
        "What do I have scheduled for today"
      ];
      const phrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
      setTranscript(phrase);
      analyzeIntent(phrase);
      setIsListening(false);
    }, 2000);
  };

  const analyzeIntent = (text: string) => {
    // Simple intent detection (in production, use NLP model)
    const lower = text.toLowerCase();

    if (lower.includes('doctor') && (lower.includes('see') || lower.includes('appointment') || lower.includes('visit'))) {
      setIntent({
        type: 'appointment',
        confidence: 0.95,
        data: {
          type: 'DOCTOR_VISIT',
          title: 'Doctor Visit',
          notes: text
        }
      });
      setShowConfirmation(true);
    } else if (lower.includes('headache') || lower.includes('dizzy') || lower.includes('pain') || lower.includes('feel')) {
      setIntent({
        type: 'symptom',
        confidence: 0.92,
        data: {
          symptoms: text,
          severity: 'MODERATE'
        }
      });
      setShowConfirmation(true);
    } else if (lower.includes('message') || lower.includes('tell') || lower.includes('contact')) {
      setIntent({
        type: 'message',
        confidence: 0.88,
        data: {
          subject: 'Health Update',
          body: text
        }
      });
      setShowConfirmation(true);
    } else if (lower.includes('remind') || lower.includes('medication') || lower.includes('medicine')) {
      setIntent({
        type: 'medication',
        confidence: 0.90,
        data: {
          reminder: text
        }
      });
      setShowConfirmation(true);
    } else if (lower.includes('today') || lower.includes('schedule') || lower.includes('summary')) {
      setIntent({
        type: 'summary',
        confidence: 0.98,
        data: {}
      });
      setShowConfirmation(false);
    }
  };

  const executeAction = async () => {
    if (!intent) return;

    switch (intent.type) {
      case 'appointment':
        alert(`Appointment request created:\n"${intent.data.title}"\n\nYour care team will contact you to schedule.`);
        break;
      case 'symptom':
        alert(`Symptom report logged:\n"${intent.data.symptoms}"\n\nYour care team has been notified.`);
        break;
      case 'message':
        alert(`Message sent to your care team:\n"${intent.data.body}"\n\nThey will respond soon.`);
        break;
      case 'medication':
        alert(`Medication reminder set:\n"${intent.data.reminder}"\n\nYou'll receive notifications.`);
        break;
    }

    setTranscript('');
    setIntent(null);
    setShowConfirmation(false);
  };

  const renderDailySummary = () => {
    if (!dailySummary) return null;

    return (
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <h3 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>📅</span>
          {dailySummary.date}
        </h3>

        {dailySummary.appointments.length > 0 ? (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Today's Appointments:
            </p>
            {dailySummary.appointments.map((apt: any) => (
              <p key={apt.id} style={{ fontSize: '16px', marginLeft: '16px', marginBottom: '4px' }}>
                • {apt.title} at {new Date(apt.scheduled_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            ✨ No appointments today - enjoy your day!
          </p>
        )}

        {dailySummary.medications.length > 0 && (
          <div>
            <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Active Medications: {dailySummary.medications.length}
            </p>
            <p style={{ fontSize: '16px', opacity: 0.9 }}>
              Don't forget to take your medications on schedule!
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderConfirmation = () => {
    if (!intent || !showConfirmation) return null;

    let message = '';
    switch (intent.type) {
      case 'appointment':
        message = `I heard you want to schedule a doctor visit. Is that correct?`;
        break;
      case 'symptom':
        message = `I heard you're experiencing: "${intent.data.symptoms}". Should I report this to your care team?`;
        break;
      case 'message':
        message = `I heard you want to send a message. Should I send: "${transcript}"?`;
        break;
      case 'medication':
        message = `I heard you want a medication reminder. Should I set that up?`;
        break;
    }

    return (
      <div style={{
        background: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '16px',
        padding: '20px',
        marginTop: '16px'
      }}>
        <p style={{
          fontSize: '20px',
          color: '#92400e',
          marginBottom: '16px',
          fontWeight: '600'
        }}>
          🎤 {message}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={executeAction}
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '20px',
              fontWeight: '700',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            ✓ Yes, Do It
          </button>
          <button
            onClick={() => {
              setTranscript('');
              setIntent(null);
              setShowConfirmation(false);
            }}
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '20px',
              fontWeight: '700',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            ✗ No, Cancel
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          border: '4px solid white',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.6)',
          fontSize: '36px',
          cursor: 'pointer',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="AI Assistant - Voice help anytime"
      >
        🤖
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      width: '450px',
      maxHeight: '80vh',
      background: 'white',
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        padding: '20px',
        borderRadius: '24px 24px 0 0',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            AI Assistant
          </h2>
          <p style={{ fontSize: '14px', margin: '4px 0 0 0', opacity: 0.9 }}>
            Voice help anytime
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{
        padding: '24px',
        overflowY: 'auto',
        flex: 1
      }}>
        {renderDailySummary()}

        <button
          onClick={startListening}
          disabled={isListening}
          style={{
            width: '100%',
            padding: '24px',
            fontSize: '24px',
            fontWeight: '700',
            background: isListening ? '#d1d5db' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            cursor: isListening ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          {isListening ? (
            <>
              <span style={{ animation: 'pulse 1s infinite' }}>🎤</span>
              Listening...
            </>
          ) : (
            <>
              <span>🎤</span>
              Tap to Speak
            </>
          )}
        </button>

        {transcript && (
          <div style={{
            background: '#f3f4f6',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              You said:
            </p>
            <p style={{ fontSize: '18px', color: '#1f2937', fontWeight: '600' }}>
              "{transcript}"
            </p>
          </div>
        )}

        {renderConfirmation()}

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f0f9ff',
          borderRadius: '12px'
        }}>
          <p style={{
            fontSize: '16px',
            color: '#1e40af',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            💡 Try saying:
          </p>
          <ul style={{
            fontSize: '14px',
            color: '#1e40af',
            marginLeft: '20px',
            lineHeight: '1.8'
          }}>
            <li>"Schedule a doctor visit"</li>
            <li>"I have a headache"</li>
            <li>"Remind me to take my medication"</li>
            <li>"Message my doctor"</li>
            <li>"What's on my schedule today?"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
