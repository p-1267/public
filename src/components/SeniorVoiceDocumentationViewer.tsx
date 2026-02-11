import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface VoiceNote {
  id: string;
  task_id: string;
  task_title: string;
  recorded_at: string;
  transcription: string;
  caregiver_name: string;
  is_senior_visible: boolean;
  summary: string | null;
}

export const SeniorVoiceDocumentationViewer: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');

  useEffect(() => {
    if (selectedResidentId) {
      loadVoiceNotes();
    }
  }, [selectedResidentId, filter]);

  const loadVoiceNotes = async () => {
    if (!selectedResidentId) return;

    setLoading(true);
    try {
      // Calculate date filter
      const now = new Date();
      let startDate: Date | null = null;

      if (filter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (filter === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      }

      // Query task_evidence for voice transcriptions
      let query = supabase
        .from('task_evidence')
        .select(`
          id,
          task_id,
          created_at,
          text_value,
          metadata,
          tasks!inner(
            id,
            title,
            resident_id,
            assigned_to,
            user_profiles!tasks_assigned_to_fkey(display_name)
          )
        `)
        .eq('tasks.resident_id', selectedResidentId)
        .eq('evidence_type', 'VOICE_TRANSCRIPTION')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Filter and format voice notes (only senior-visible ones)
      const formatted: VoiceNote[] = (data || [])
        .map((item: any) => {
          // Check if note is marked as senior-visible in metadata
          const isSeniorVisible = item.metadata?.senior_visible !== false;

          // Filter out sensitive caregiver notes
          const transcription = item.text_value || '';
          const filteredTranscription = filterSensitiveContent(transcription);

          return {
            id: item.id,
            task_id: item.task_id,
            task_title: item.tasks?.title || 'Care Activity',
            recorded_at: item.created_at,
            transcription: filteredTranscription,
            caregiver_name: item.tasks?.user_profiles?.display_name || 'Care Team',
            is_senior_visible: isSeniorVisible,
            summary: item.metadata?.summary || null
          };
        })
        .filter((note: VoiceNote) => note.is_senior_visible && note.transcription.length > 0);

      setVoiceNotes(formatted);
    } catch (err) {
      console.error('Error loading voice notes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter out sensitive caregiver-only content
  const filterSensitiveContent = (text: string): string => {
    if (!text) return '';

    // Remove patterns that indicate sensitive caregiver notes
    const sensitivePatterns = [
      /\[STAFF ONLY:.*?\]/gi,
      /\[INTERNAL:.*?\]/gi,
      /\[SUPERVISOR:.*?\]/gi,
      /\[INCIDENT:.*?\]/gi
    ];

    let filtered = text;
    sensitivePatterns.forEach(pattern => {
      filtered = filtered.replace(pattern, '');
    });

    return filtered.trim();
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading voice notes...</div>
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
          Care Notes
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#666',
          margin: 0
        }}>
          Voice notes from your care team about your daily care
        </p>
      </div>

      {/* Time Filter */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        {[
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This Week' },
          { key: 'all', label: 'All Time' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              background: 'transparent',
              color: filter === tab.key ? '#3b82f6' : '#6b7280',
              borderBottom: filter === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {voiceNotes.length === 0 ? (
        <div style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
          <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
            No voice notes found
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            Voice notes from your care team will appear here
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {voiceNotes.map(note => (
            <div
              key={note.id}
              style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px'
                }}>
                  <span style={{ fontSize: '20px' }}>👤</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
                    {note.caregiver_name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {formatDate(note.recorded_at)}
                  </div>
                </div>
                <span style={{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  🎤 VOICE
                </span>
              </div>

              <div style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#6b7280',
                marginBottom: '8px'
              }}>
                {note.task_title}
              </div>

              {note.summary && (
                <div style={{
                  background: '#f9fafb',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {note.summary}
                </div>
              )}

              <div style={{
                fontSize: '16px',
                lineHeight: '1.6',
                color: '#374151'
              }}>
                {note.transcription}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
