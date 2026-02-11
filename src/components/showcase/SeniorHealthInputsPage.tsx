import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface HealthInputForm {
  systolic: string;
  diastolic: string;
  weight: string;
  pain_level: string;
  symptom_shortness_breath: boolean;
  symptom_chest_pain: boolean;
  symptom_dizziness: boolean;
  symptom_fatigue: boolean;
  notes: string;
}

interface RecentVitals {
  blood_pressure: {
    systolic: number;
    diastolic: number;
    recorded_at: string;
  } | null;
  weight: {
    value: number;
    recorded_at: string;
  } | null;
  pain_level: {
    value: number;
    recorded_at: string;
  } | null;
  symptoms: {
    data: any;
    recorded_at: string;
  } | null;
}

export const SeniorHealthInputsPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [residentId, setResidentId] = useState<string | null>(null);
  const [recentVitals, setRecentVitals] = useState<RecentVitals | null>(null);

  const [formData, setFormData] = useState<HealthInputForm>({
    systolic: '',
    diastolic: '',
    weight: '',
    pain_level: '',
    symptom_shortness_breath: false,
    symptom_chest_pain: false,
    symptom_dizziness: false,
    symptom_fatigue: false,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: link } = await supabase
        .from('senior_resident_links')
        .select('resident_id')
        .eq('senior_user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!link) throw new Error('No resident link found');

      setResidentId(link.resident_id);

      const { data: vitals, error: vitalsError } = await supabase.rpc('get_senior_recent_vitals', {
        p_resident_id: link.resident_id,
        p_days_back: 7,
        p_is_simulation: isShowcaseMode,
      });

      if (vitalsError) throw vitalsError;

      setRecentVitals(vitals as RecentVitals);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!residentId) return;

    const hasAnyData =
      formData.systolic || formData.diastolic || formData.weight ||
      formData.pain_level || formData.notes ||
      formData.symptom_shortness_breath || formData.symptom_chest_pain ||
      formData.symptom_dizziness || formData.symptom_fatigue;

    if (!hasAnyData) {
      setError('Please enter at least one health measurement');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const symptoms = {
        shortness_of_breath: formData.symptom_shortness_breath,
        chest_pain: formData.symptom_chest_pain,
        dizziness: formData.symptom_dizziness,
        fatigue: formData.symptom_fatigue,
      };

      const hasSymptoms = Object.values(symptoms).some(v => v);

      const idempotencyKey = `health-${residentId}-${Date.now()}`;

      const { data, error: submitError } = await supabase.rpc('senior_submit_health_inputs', {
        p_resident_id: residentId,
        p_systolic: formData.systolic ? parseFloat(formData.systolic) : null,
        p_diastolic: formData.diastolic ? parseFloat(formData.diastolic) : null,
        p_weight: formData.weight ? parseFloat(formData.weight) : null,
        p_pain_level: formData.pain_level ? parseInt(formData.pain_level) : null,
        p_symptoms: hasSymptoms || formData.notes ? symptoms : null,
        p_notes: formData.notes || null,
        p_idempotency_key: idempotencyKey,
        p_is_simulation: isShowcaseMode,
      });

      if (submitError) throw submitError;

      setSuccess(true);

      setFormData({
        systolic: '',
        diastolic: '',
        weight: '',
        pain_level: '',
        symptom_shortness_breath: false,
        symptom_chest_pain: false,
        symptom_dizziness: false,
        symptom_fatigue: false,
        notes: '',
      });

      setTimeout(() => setSuccess(false), 3000);

      await loadData();
    } catch (err) {
      console.error('Error submitting health inputs:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit health inputs');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Health Inputs</h1>
        <p className="text-gray-600 mt-1">
          Log your daily health measurements. Your care team monitors these values and may reach out if they see concerning changes.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Health data submitted successfully! Your care team has been notified.</p>
        </div>
      )}

      {/* Recent Values Summary */}
      {recentVitals && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Your Recent Measurements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Blood Pressure:</span>
              <div className="text-blue-900">
                {recentVitals.blood_pressure
                  ? `${recentVitals.blood_pressure.systolic}/${recentVitals.blood_pressure.diastolic}`
                  : 'No data'}
              </div>
              <div className="text-blue-600 text-xs">
                {formatDate(recentVitals.blood_pressure?.recorded_at || null)}
              </div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Weight:</span>
              <div className="text-blue-900">
                {recentVitals.weight ? `${recentVitals.weight.value} lbs` : 'No data'}
              </div>
              <div className="text-blue-600 text-xs">
                {formatDate(recentVitals.weight?.recorded_at || null)}
              </div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Pain Level:</span>
              <div className="text-blue-900">
                {recentVitals.pain_level ? `${recentVitals.pain_level.value}/10` : 'No data'}
              </div>
              <div className="text-blue-600 text-xs">
                {formatDate(recentVitals.pain_level?.recorded_at || null)}
              </div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Last Symptoms:</span>
              <div className="text-blue-900 text-xs">
                {recentVitals.symptoms ? formatDate(recentVitals.symptoms.recorded_at) : 'No data'}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Blood Pressure */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Blood Pressure</h2>
          <p className="text-sm text-gray-600 mb-4">
            Record your blood pressure readings. Take readings at the same time each day for best results.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Systolic (top number)
              </label>
              <input
                type="number"
                value={formData.systolic}
                onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 120"
                min="60"
                max="250"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diastolic (bottom number)
              </label>
              <input
                type="number"
                value={formData.diastolic}
                onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 80"
                min="40"
                max="150"
              />
            </div>
          </div>
        </div>

        {/* Weight */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Weight</h2>
          <p className="text-sm text-gray-600 mb-4">
            Track your weight. Significant changes may indicate health issues.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (lbs)
            </label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 165"
              min="50"
              max="500"
              step="0.1"
            />
          </div>
        </div>

        {/* Symptoms & How You Feel */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Symptoms & How You Feel</h2>
          <p className="text-sm text-gray-600 mb-4">
            Let us know about any symptoms or concerns.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pain Level (0-10)
              </label>
              <input
                type="number"
                value={formData.pain_level}
                onChange={(e) => setFormData({ ...formData, pain_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 = no pain, 10 = worst pain"
                min="0"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Do you have any of these symptoms today?
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.symptom_shortness_breath}
                    onChange={(e) => setFormData({ ...formData, symptom_shortness_breath: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Shortness of breath</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.symptom_chest_pain}
                    onChange={(e) => setFormData({ ...formData, symptom_chest_pain: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Chest pain or discomfort</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.symptom_dizziness}
                    onChange={(e) => setFormData({ ...formData, symptom_dizziness: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Dizziness or lightheadedness</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.symptom_fatigue}
                    onChange={(e) => setFormData({ ...formData, symptom_fatigue: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Unusual fatigue</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Anything else you want your care team to know?"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Health Data'}
        </button>

        <p className="text-sm text-gray-500 text-center">
          Your health data will be saved and reviewed by your care team. You will receive confirmation.
        </p>
      </form>
    </div>
  );
};
