import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface HandoffData {
  id: string;
  time_period_start: string;
  time_period_end: string;
  tasks_completed: Array<{
    task_name: string;
    resident_name: string;
    completed_at: string;
    outcome: string;
  }>;
  tasks_pending: Array<{
    task_name: string;
    resident_name: string;
    scheduled_start: string;
    priority: string;
  }>;
  tasks_overdue: Array<{
    task_name: string;
    resident_name: string;
    overdue_minutes: number;
    escalation_level: number;
  }>;
  warnings: Array<{
    warning_type: string;
    severity: string;
    message: string;
  }>;
  special_notes: string | null;
  reviewed: boolean;
}

interface HandoffSummaryProps {
  handoffId?: string;
  onAcknowledge?: () => void;
}

export function HandoffSummary({ handoffId, onAcknowledge }: HandoffSummaryProps) {
  const [handoff, setHandoff] = useState<HandoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (handoffId) {
      fetchHandoff(handoffId);
    } else {
      fetchLatestHandoff();
    }
  }, [handoffId]);

  const fetchHandoff = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('handoff_summaries')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setHandoff(data as HandoffData);
    }
    setLoading(false);
  };

  const fetchLatestHandoff = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('handoff_summaries')
      .select('*')
      .eq('to_user_id', user.user.id)
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setHandoff(data as HandoffData);
    }
    setLoading(false);
  };

  const handleAcknowledge = async () => {
    if (!handoff) return;

    setAcknowledging(true);
    const { data: user } = await supabase.auth.getUser();

    await supabase
      .from('handoff_summaries')
      .update({
        reviewed: true,
        reviewed_by: user.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', handoff.id);

    setAcknowledging(false);
    onAcknowledge?.();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading handoff...</p>
        </div>
      </div>
    );
  }

  if (!handoff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">✓</span>
          <p className="text-xl text-gray-600">No pending handoffs</p>
        </div>
      </div>
    );
  }

  const hasUrgentIssues = handoff.tasks_overdue.length > 0 ||
    handoff.warnings.some(w => w.severity === 'high' || w.severity === 'critical');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-8 rounded-t-3xl">
          <h2 className="text-3xl font-light mb-2">Shift Handoff</h2>
          <p className="text-lg opacity-90">
            {new Date(handoff.time_period_start).toLocaleTimeString()} - {new Date(handoff.time_period_end).toLocaleTimeString()}
          </p>
          {hasUrgentIssues && (
            <div className="mt-4 bg-red-500 bg-opacity-30 border-2 border-white border-opacity-50 rounded-2xl p-4 flex items-center space-x-3">
              <span className="text-3xl">⚠️</span>
              <span className="text-lg font-medium">Urgent issues require attention</span>
            </div>
          )}
        </div>

        <div className="p-8 space-y-6">
          {handoff.tasks_completed.length > 0 && (
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-3 flex items-center">
                <span className="text-2xl mr-2">✓</span>
                Completed ({handoff.tasks_completed.length})
              </h3>
              <div className="bg-green-50 rounded-2xl p-4 space-y-2">
                {handoff.tasks_completed.slice(0, 5).map((task, idx) => (
                  <div key={idx} className="text-gray-700">
                    • {task.task_name} - {task.resident_name}
                  </div>
                ))}
                {handoff.tasks_completed.length > 5 && (
                  <div className="text-gray-500 text-sm">
                    + {handoff.tasks_completed.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {handoff.tasks_overdue.length > 0 && (
            <div>
              <h3 className="text-xl font-medium text-red-600 mb-3 flex items-center">
                <span className="text-2xl mr-2">🔴</span>
                OVERDUE - Needs Immediate Attention
              </h3>
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 space-y-3">
                {handoff.tasks_overdue.map((task, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-3">
                    <div className="font-medium text-gray-900">{task.task_name}</div>
                    <div className="text-sm text-gray-600">{task.resident_name}</div>
                    <div className="text-sm text-red-600 font-medium mt-1">
                      {Math.floor(task.overdue_minutes)} min overdue
                      {task.escalation_level > 0 && ` • Level ${task.escalation_level} escalation`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {handoff.tasks_pending.length > 0 && (
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-3 flex items-center">
                <span className="text-2xl mr-2">📋</span>
                Open Tasks ({handoff.tasks_pending.length})
              </h3>
              <div className="bg-blue-50 rounded-2xl p-4 space-y-2">
                {handoff.tasks_pending.slice(0, 8).map((task, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="text-gray-700">
                      • {task.task_name} - {task.resident_name}
                    </div>
                    {task.priority === 'critical' && (
                      <span className="text-red-500 font-medium text-sm">CRITICAL</span>
                    )}
                  </div>
                ))}
                {handoff.tasks_pending.length > 8 && (
                  <div className="text-gray-500 text-sm">
                    + {handoff.tasks_pending.length - 8} more
                  </div>
                )}
              </div>
            </div>
          )}

          {handoff.warnings.length > 0 && (
            <div>
              <h3 className="text-xl font-medium text-amber-600 mb-3 flex items-center">
                <span className="text-2xl mr-2">⚠️</span>
                Warnings
              </h3>
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
                {handoff.warnings.map((warning, idx) => (
                  <div key={idx} className="text-gray-700">
                    • {warning.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {handoff.special_notes && (
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-3 flex items-center">
                <span className="text-2xl mr-2">📝</span>
                Special Notes
              </h3>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-gray-700">{handoff.special_notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6 rounded-b-3xl">
          <button
            onClick={handleAcknowledge}
            disabled={acknowledging}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl py-4 text-xl font-medium transition-all disabled:opacity-50 shadow-lg"
          >
            {acknowledging ? 'Acknowledging...' : 'Acknowledge & Start Shift'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-3">
            You must acknowledge this handoff to proceed
          </p>
        </div>
      </div>
    </div>
  );
}
