import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

function generateUUID(): string {
  return crypto.randomUUID();
}

interface Review {
  id: string;
  review_type: string;
  status: string;
  severity: string;
  resident_id: string;
  resident_name: string;
  caregiver_id: string;
  caregiver_name: string;
  review_data: {
    activity_type?: string;
    concern?: string;
    observation_id?: string;
  };
  created_at: string;
}

export const SupervisorReviewPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const [comments, setComments] = useState('');
  const [qualityRating, setQualityRating] = useState<number | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateUUID());

  useEffect(() => {
    loadReviews();
  }, [filterType, isShowcaseMode]);

  const loadReviews = async () => {
    setLoading(true);
    const agencyId = '00000000-0000-0000-0000-000000000001';
    const supervisorId = '00000000-0000-0000-0000-000000000005';

    const { data, error } = await supabase.rpc('get_supervisor_pending_reviews', {
      p_supervisor_id: supervisorId,
      p_agency_id: agencyId,
      p_filter_type: filterType,
      p_is_simulation: isShowcaseMode,
    });

    if (!error && data) {
      setReviews(data);
    }
    setLoading(false);
  };

  const handleAction = async (action: 'approve' | 'reject' | 'escalate') => {
    if (!selectedReview) return;

    setSubmitting(true);
    const supervisorId = '00000000-0000-0000-0000-000000000005';

    const { data, error } = await supabase.rpc('submit_supervisor_review_action', {
      p_review_id: selectedReview.id,
      p_supervisor_id: supervisorId,
      p_action: action,
      p_comments: comments || null,
      p_quality_rating: qualityRating,
      p_escalate_to: null,
      p_escalation_reason: null,
      p_idempotency_key: idempotencyKey,
      p_is_simulation: isShowcaseMode,
    });

    if (!error) {
      setIdempotencyKey(generateUUID());
      setComments('');
      setQualityRating(null);
      setSelectedReview(null);
      loadReviews();
    }

    setSubmitting(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Care Logs</h1>
        <p className="text-gray-600">Review and approve care logs, concerns, and incidents submitted by caregivers</p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
        <select
          value={filterType || 'all'}
          onChange={(e) => setFilterType(e.target.value === 'all' ? null : e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Types</option>
          <option value="concern">Concerns</option>
          <option value="incident">Incidents</option>
          <option value="task">Task Reviews</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No pending reviews</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Pending Reviews ({reviews.length})</h2>
            {reviews.map((review) => (
              <div
                key={review.id}
                onClick={() => setSelectedReview(review)}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedReview?.id === review.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{review.resident_name}</div>
                    <div className="text-sm text-gray-600">By: {review.caregiver_name}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(review.severity)}`}>
                    {review.severity}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">Type:</span> {review.review_type}
                </div>
                {review.review_data?.activity_type && (
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Activity:</span> {review.review_data.activity_type}
                  </div>
                )}
                {review.review_data?.concern && (
                  <div className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                    {review.review_data.concern}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(review.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-6 sticky top-6 h-fit">
            {selectedReview ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Details</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resident</label>
                    <div className="text-gray-900">{selectedReview.resident_name}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caregiver</label>
                    <div className="text-gray-900">{selectedReview.caregiver_name}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setQualityRating(rating)}
                          className={`w-10 h-10 rounded border-2 font-medium transition-colors ${
                            qualityRating === rating
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Add your review comments..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {submitting ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction('escalate')}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 font-medium"
                  >
                    Escalate
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Select a review to take action
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
