import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DecisionPoint {
  timestamp: string;
  actor_id: string;
  actor_name: string;
  decision_type: string;
  input_state: any;
  output_state: any;
  reasoning: string;
  alternatives_considered: string[];
}

interface ForensicTimeline {
  id: string;
  event_type: string;
  resident_id: string;
  resident_name: string;
  start_time: string;
  end_time: string;
  is_sealed: boolean;
  decision_points: DecisionPoint[];
  state_snapshots: any[];
}

export function ForensicReplayConsole() {
  const [timelines, setTimelines] = useState<ForensicTimeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<ForensicTimeline | null>(null);
  const [replayPosition, setReplayPosition] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForensicTimelines();
  }, []);

  const loadForensicTimelines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forensic_timelines')
        .select(`
          *,
          resident:residents(full_name)
        `)
        .eq('is_sealed', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const enrichedTimelines = await Promise.all(
        (data || []).map(async (timeline) => {
          const { data: decisionData } = await supabase
            .from('forensic_decision_points')
            .select('*')
            .eq('timeline_id', timeline.id)
            .order('timestamp', { ascending: true });

          return {
            ...timeline,
            resident_name: timeline.resident?.full_name || 'Unknown',
            decision_points: decisionData || [],
            state_snapshots: timeline.state_snapshots || []
          };
        })
      );

      setTimelines(enrichedTimelines as ForensicTimeline[]);
    } catch (err) {
      console.error('Failed to load forensic timelines:', err);
    } finally {
      setLoading(false);
    }
  };

  const createReplaySession = async (timelineId: string) => {
    try {
      const { data, error } = await supabase.rpc('create_replay_session', {
        p_timeline_id: timelineId
      });

      if (error) throw error;

      const timeline = timelines.find(t => t.id === timelineId);
      if (timeline) {
        setSelectedTimeline(timeline);
        setReplayPosition(0);
      }
    } catch (err) {
      console.error('Failed to create replay session:', err);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading forensic timelines...</div>;
  }

  if (!selectedTimeline) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Forensic Replay Console</h2>
          <div className="text-sm text-gray-600">Time-Travel Debugging for Sealed Events</div>
        </div>

        <div className="bg-blue-50 border border-blue-300 rounded p-4">
          <div className="text-sm font-bold text-blue-900 mb-2">What is Forensic Replay?</div>
          <div className="text-sm text-blue-800">
            Forensic Replay enables complete reconstruction of past events with all decision points,
            actor reasoning, and state changes. Every action is immutably recorded for legal review,
            compliance auditing, and incident investigation.
          </div>
        </div>

        {timelines.length === 0 ? (
          <div className="bg-gray-50 border border-gray-300 rounded p-8 text-center">
            <div className="text-4xl mb-4">📼</div>
            <div className="text-lg font-semibold text-gray-700">No Sealed Timelines</div>
            <div className="text-sm text-gray-600 mt-2">
              Forensic timelines are created automatically for critical events
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {timelines.map((timeline) => (
              <div
                key={timeline.id}
                className="bg-white border-2 border-gray-300 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-all"
                onClick={() => createReplaySession(timeline.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-lg font-bold">{timeline.event_type.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-gray-600">{timeline.resident_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {new Date(timeline.start_time).toLocaleString()}
                    </div>
                    {timeline.is_sealed && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mt-1 inline-block">
                        🔒 SEALED
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700">
                  {timeline.decision_points.length} decision points · {timeline.state_snapshots.length} state snapshots
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentDecision = selectedTimeline.decision_points[replayPosition];
  const progress = selectedTimeline.decision_points.length > 0
    ? ((replayPosition + 1) / selectedTimeline.decision_points.length) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Forensic Replay: {selectedTimeline.event_type.replace(/_/g, ' ')}</h2>
          <div className="text-sm text-gray-600">{selectedTimeline.resident_name}</div>
        </div>
        <button
          onClick={() => setSelectedTimeline(null)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ← Back to Timelines
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-semibold">
            Decision Point {replayPosition + 1} of {selectedTimeline.decision_points.length}
          </div>
          <div className="text-sm text-gray-600">
            {Math.round(progress)}% Complete
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setReplayPosition(Math.max(0, replayPosition - 1))}
            disabled={replayPosition === 0}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={() => setReplayPosition(Math.min(selectedTimeline.decision_points.length - 1, replayPosition + 1))}
            disabled={replayPosition >= selectedTimeline.decision_points.length - 1}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
          <button
            onClick={() => setReplayPosition(0)}
            className="ml-auto px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ↻ Restart
          </button>
        </div>
      </div>

      {currentDecision && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">TIMESTAMP</div>
                <div className="font-semibold">{new Date(currentDecision.timestamp).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600 mb-1">ACTOR</div>
                <div className="font-semibold">{currentDecision.actor_name}</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-600 mb-1">DECISION TYPE</div>
              <div className="text-lg font-bold text-blue-900">{currentDecision.decision_type}</div>
            </div>

            <div className="mb-3 bg-blue-50 border border-blue-300 rounded p-3">
              <div className="text-xs font-bold text-blue-900 mb-2">REASONING</div>
              <div className="text-sm text-blue-800">{currentDecision.reasoning}</div>
            </div>

            {currentDecision.alternatives_considered && currentDecision.alternatives_considered.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                <div className="text-xs font-bold text-yellow-900 mb-2">ALTERNATIVES CONSIDERED</div>
                <ul className="list-disc list-inside space-y-1">
                  {currentDecision.alternatives_considered.map((alt, idx) => (
                    <li key={idx} className="text-sm text-yellow-800">{alt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-300 rounded p-4">
              <div className="text-sm font-bold text-red-900 mb-2">INPUT STATE</div>
              <pre className="text-xs text-red-800 overflow-auto max-h-64 bg-white p-2 rounded">
                {JSON.stringify(currentDecision.input_state, null, 2)}
              </pre>
            </div>
            <div className="bg-green-50 border border-green-300 rounded p-4">
              <div className="text-sm font-bold text-green-900 mb-2">OUTPUT STATE</div>
              <pre className="text-xs text-green-800 overflow-auto max-h-64 bg-white p-2 rounded">
                {JSON.stringify(currentDecision.output_state, null, 2)}
              </pre>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-300 rounded p-4">
            <div className="text-sm font-bold text-gray-900 mb-2">🔒 Immutability Guarantee</div>
            <div className="text-sm text-gray-700">
              This timeline is sealed and cannot be modified. All decision points are cryptographically
              linked and auditable. Timestamp: {new Date(selectedTimeline.end_time).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
