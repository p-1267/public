import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PendingTask {
  task_id: string;
  task_name: string;
  resident_name: string;
  caregiver_name: string;
  completed_at: string;
  outcome: string;
  evidence_count: number;
  priority: string;
  risk_level: string;
  review_status: string;
  reviewer_comments: string;
}

interface EvidenceItem {
  id: string;
  evidence_type: string;
  file_url: string;
  transcription: string;
  metric_name: string;
  metric_value: number;
  notes: string;
  captured_at: string;
}

interface ReviewForm {
  task_id: string;
  status: string;
  comments: string;
  quality_rating: number;
  flagged_issues: string[];
}

interface SupervisorReviewDashboardProps {
  agencyId: string;
  departmentId?: string;
}

export function SupervisorReviewDashboard({
  agencyId,
  departmentId,
}: SupervisorReviewDashboardProps) {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [viewingTask, setViewingTask] = useState<PendingTask | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [batchAction, setBatchAction] = useState<string>('');
  const [batchComments, setBatchComments] = useState<string>('');
  const [batchRating, setBatchRating] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    loadPendingTasks();
    const subscription = subscribeToTaskUpdates();
    return () => {
      subscription.unsubscribe();
    };
  }, [agencyId, departmentId]);

  const loadPendingTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_pending_review_queue', {
        p_agency_id: agencyId,
        p_department_id: departmentId || null,
        p_limit: 100,
      });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading pending tasks:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load pending tasks',
      });
    }
    setLoading(false);
  };

  const subscribeToTaskUpdates = () => {
    return supabase
      .channel('review_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supervisor_reviews',
        },
        () => {
          loadPendingTasks();
        }
      )
      .subscribe();
  };

  const loadEvidence = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_evidence')
        .select('*')
        .eq('task_id', taskId)
        .order('captured_at', { ascending: true });

      if (error) throw error;
      setEvidence(data || []);
    } catch (error) {
      console.error('Error loading evidence:', error);
    }
  };

  const handleViewTask = async (task: PendingTask) => {
    setViewingTask(task);
    await loadEvidence(task.task_id);
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const selectAll = () => {
    setSelectedTasks(new Set(tasks.map((t) => t.task_id)));
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
  };

  const handleBatchReview = async () => {
    if (selectedTasks.size === 0) {
      setMessage({ type: 'error', text: 'No tasks selected' });
      return;
    }

    if (!batchAction) {
      setMessage({ type: 'error', text: 'Please select an action' });
      return;
    }

    setReviewing(true);
    setMessage(null);

    try {
      const reviews = Array.from(selectedTasks).map((taskId) => ({
        task_id: taskId,
        status: batchAction,
        comments: batchComments,
        quality_rating: batchRating,
        flagged_issues: [],
      }));

      const { data, error } = await supabase.rpc('batch_review_tasks', {
        p_reviews: reviews,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        reviewed_count: number;
        total_count: number;
        errors: any[];
      };

      if (result.success && result.errors.length === 0) {
        setMessage({
          type: 'success',
          text: `Successfully reviewed ${result.reviewed_count} task(s)`,
        });
        setSelectedTasks(new Set());
        setBatchAction('');
        setBatchComments('');
        setBatchRating(5);
        loadPendingTasks();
      } else {
        setMessage({
          type: 'error',
          text: `Reviewed ${result.reviewed_count}/${result.total_count} tasks. ${result.errors.length} errors.`,
        });
      }
    } catch (error) {
      console.error('Error reviewing tasks:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to review tasks',
      });
    }

    setReviewing(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-blue-100 text-blue-800 border-blue-300',
      low: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[priority] || colors.medium;
  };

  const getOutcomeColor = (outcome: string) => {
    const colors: { [key: string]: string } = {
      success: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-gray-100 text-gray-800',
    };
    return colors[outcome] || colors.success;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading review queue...</div>
      </div>
    );
  }

  if (viewingTask) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={() => setViewingTask(null)}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
          >
            ← Back to Review Queue
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {viewingTask.task_name}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Resident: {viewingTask.resident_name}</span>
            <span>•</span>
            <span>Completed by: {viewingTask.caregiver_name}</span>
            <span>•</span>
            <span>
              {new Date(viewingTask.completed_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Task Outcome
            </h3>
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${getOutcomeColor(
                viewingTask.outcome
              )}`}
            >
              {viewingTask.outcome.toUpperCase()}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Evidence ({evidence.length} item{evidence.length !== 1 ? 's' : ''})
            </h3>
            {evidence.length === 0 ? (
              <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                No evidence submitted for this task
              </div>
            ) : (
              <div className="space-y-4">
                {evidence.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {item.evidence_type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.captured_at).toLocaleString()}
                      </span>
                    </div>

                    {item.evidence_type === 'photo' && item.file_url && (
                      <img
                        src={item.file_url}
                        alt="Evidence"
                        className="w-64 h-64 object-cover rounded"
                      />
                    )}

                    {item.evidence_type === 'voice' && (
                      <div className="space-y-2">
                        {item.file_url && (
                          <div className="text-sm text-gray-600">
                            Audio: {item.file_url}
                          </div>
                        )}
                        {item.transcription && (
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                            <strong>Transcription:</strong> {item.transcription}
                          </div>
                        )}
                      </div>
                    )}

                    {item.evidence_type === 'metric' && (
                      <div className="text-sm text-gray-700">
                        <strong>{item.metric_name}:</strong> {item.metric_value}
                      </div>
                    )}

                    {item.evidence_type === 'note' && item.notes && (
                      <div className="text-sm text-gray-700">{item.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Review Decision
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action
                </label>
                <select
                  value={batchAction}
                  onChange={(e) => setBatchAction(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select action...</option>
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="needs_revision">Needs Revision</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setBatchRating(rating)}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        batchRating === rating
                          ? 'bg-yellow-400 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {rating}★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments
                </label>
                <textarea
                  value={batchComments}
                  onChange={(e) => setBatchComments(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add review comments..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setViewingTask(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleBatchReview();
                    setViewingTask(null);
                  }}
                  disabled={!batchAction || reviewing}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {reviewing ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review Queue
        </h2>
        <p className="text-sm text-gray-600">
          {tasks.length} task(s) pending review
        </p>
      </div>

      {message && (
        <div
          className={`mx-6 mt-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Batch Review Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">
                Action
              </label>
              <select
                value={batchAction}
                onChange={(e) => setBatchAction(e.target.value)}
                className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
              >
                <option value="">Select...</option>
                <option value="approved">Approve</option>
                <option value="rejected">Reject</option>
                <option value="needs_revision">Needs Revision</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">
                Rating
              </label>
              <select
                value={batchRating}
                onChange={(e) => setBatchRating(Number(e.target.value))}
                className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r}★
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">
                Comments (optional)
              </label>
              <input
                type="text"
                value={batchComments}
                onChange={(e) => setBatchComments(e.target.value)}
                className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
                placeholder="Batch comments..."
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleBatchReview}
                disabled={reviewing || selectedTasks.size === 0 || !batchAction}
                className="w-full px-4 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Review {selectedTasks.size} Task(s)
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear
            </button>
            <span className="text-sm text-gray-600">
              {selectedTasks.size} selected
            </span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={tasks.length > 0 && selectedTasks.size === tasks.length}
                      onChange={() =>
                        selectedTasks.size === tasks.length
                          ? clearSelection()
                          : selectAll()
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Resident
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Caregiver
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Outcome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Evidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No tasks pending review
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.task_id}
                      className={`hover:bg-gray-50 ${
                        selectedTasks.has(task.task_id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.task_id)}
                          onChange={() => toggleTaskSelection(task.task_id)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {task.task_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {task.resident_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {task.caregiver_name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getOutcomeColor(
                            task.outcome
                          )}`}
                        >
                          {task.outcome.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {task.evidence_count} item(s)
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(task.completed_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewTask(task)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
