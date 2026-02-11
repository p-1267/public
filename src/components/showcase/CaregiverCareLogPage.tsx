import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
}

interface CareLogForm {
  resident_id: string;
  activity_type: string;
  activity_time: string;
  care_provided: string;
  resident_response: string;
  resident_mood: string;
  skin_condition: string;
  mobility: string;
  appetite: string;
  fluid_intake: string;
  has_concern: boolean;
  concern_priority: string;
  concern_description: string;
}

export const CaregiverCareLogPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<CareLogForm>({
    resident_id: '',
    activity_type: 'personal_care',
    activity_time: new Date().toTimeString().substring(0, 5),
    care_provided: '',
    resident_response: 'cooperative_engaged',
    resident_mood: 'content',
    skin_condition: 'normal',
    mobility: 'normal',
    appetite: 'ate_all',
    fluid_intake: 'adequate',
    has_concern: false,
    concern_priority: 'routine',
    concern_description: '',
  });

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('agency_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      const { data, error: fetchError } = await supabase
        .from('residents')
        .select('id, first_name, last_name')
        .eq('agency_id', profile.agency_id)
        .eq('is_simulation', isShowcaseMode)
        .order('last_name', { ascending: true });

      if (fetchError) throw fetchError;

      setResidents(data || []);
    } catch (err) {
      console.error('Error loading residents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();

    if (isDraft) {
      alert('Draft functionality would save locally for completion later');
      return;
    }

    if (!formData.resident_id) {
      setError('Please select a resident');
      return;
    }

    if (!formData.care_provided.trim()) {
      setError('Please describe the care provided');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('agency_id, id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      const today = new Date().toISOString().split('T')[0];
      const activityTimestamp = new Date(`${today}T${formData.activity_time}:00`);

      const { data, error: submitError } = await supabase.rpc('submit_care_log_entry', {
        p_agency_id: profile.agency_id,
        p_resident_id: formData.resident_id,
        p_caregiver_id: profile.id,
        p_activity_type: formData.activity_type,
        p_activity_time: activityTimestamp.toISOString(),
        p_care_provided: formData.care_provided,
        p_resident_response: formData.resident_response,
        p_resident_mood: formData.resident_mood,
        p_skin_condition: formData.skin_condition,
        p_mobility: formData.mobility,
        p_appetite: formData.appetite,
        p_fluid_intake: formData.fluid_intake,
        p_has_concern: formData.has_concern,
        p_concern_priority: formData.concern_priority,
        p_concern_description: formData.concern_description || null,
        p_voice_transcript_id: null,
        p_is_simulation: isShowcaseMode,
      });

      if (submitError) throw submitError;

      setSuccess(true);

      setFormData({
        resident_id: '',
        activity_type: 'personal_care',
        activity_time: new Date().toTimeString().substring(0, 5),
        care_provided: '',
        resident_response: 'cooperative_engaged',
        resident_mood: 'content',
        skin_condition: 'normal',
        mobility: 'normal',
        appetite: 'ate_all',
        fluid_intake: 'adequate',
        has_concern: false,
        concern_priority: 'routine',
        concern_description: '',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error submitting care log:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit care log');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading residents...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Care Log Entry</h1>
        <p className="text-gray-600 mt-1">
          Document care activities, observations, and any concerns. These notes become part of the resident's permanent care record.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Care log submitted successfully!</p>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Care Activity</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resident *
              </label>
              <select
                value={formData.resident_id}
                onChange={(e) => setFormData({ ...formData, resident_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a resident</option>
                {residents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.last_name}, {resident.first_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Type *
              </label>
              <select
                value={formData.activity_type}
                onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="personal_care">Personal Care (bathing, dressing)</option>
                <option value="meal_assistance">Meal Assistance</option>
                <option value="mobility_assistance">Mobility Assistance</option>
                <option value="health_monitoring">Health Monitoring</option>
                <option value="social_interaction">Social Interaction</option>
                <option value="safety_check">Safety Check</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time of Activity *
              </label>
              <input
                type="time"
                value={formData.activity_time}
                onChange={(e) => setFormData({ ...formData, activity_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What care was provided? *
              </label>
              <textarea
                value={formData.care_provided}
                onChange={(e) => setFormData({ ...formData, care_provided: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the care activity in detail..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resident's response
              </label>
              <select
                value={formData.resident_response}
                onChange={(e) => setFormData({ ...formData, resident_response: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cooperative_engaged">Cooperative and engaged</option>
                <option value="cooperative_quiet">Cooperative but quiet</option>
                <option value="resistant">Resistant or upset</option>
                <option value="confused">Confused or disoriented</option>
                <option value="no_response">No response/unresponsive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resident's mood
              </label>
              <select
                value={formData.resident_mood}
                onChange={(e) => setFormData({ ...formData, resident_mood: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="happy">Happy</option>
                <option value="content">Content</option>
                <option value="neutral">Neutral</option>
                <option value="sad">Sad</option>
                <option value="anxious">Anxious</option>
                <option value="agitated">Agitated</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Observations</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skin condition
              </label>
              <select
                value={formData.skin_condition}
                onChange={(e) => setFormData({ ...formData, skin_condition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="dry">Dry</option>
                <option value="redness">Redness observed</option>
                <option value="bruising">Bruising observed</option>
                <option value="rash">Rash observed</option>
                <option value="wound">Wound observed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobility
              </label>
              <select
                value={formData.mobility}
                onChange={(e) => setFormData({ ...formData, mobility: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="walker">Using walker</option>
                <option value="wheelchair">Wheelchair</option>
                <option value="assistance">Assistance required</option>
                <option value="bedbound">Bedbound</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appetite
              </label>
              <select
                value={formData.appetite}
                onChange={(e) => setFormData({ ...formData, appetite: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ate_all">Ate all</option>
                <option value="ate_most">Ate most</option>
                <option value="ate_some">Ate some</option>
                <option value="ate_little">Ate very little</option>
                <option value="refused">Refused food</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fluid intake
              </label>
              <select
                value={formData.fluid_intake}
                onChange={(e) => setFormData({ ...formData, fluid_intake: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="adequate">Adequate</option>
                <option value="limited">Limited</option>
                <option value="refused">Refused fluids</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Concerns or Follow-up Needed</h2>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="has_concern"
                checked={formData.has_concern}
                onChange={(e) => setFormData({ ...formData, has_concern: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="has_concern" className="ml-2 block text-sm text-gray-700">
                This activity requires follow-up
              </label>
            </div>

            {formData.has_concern && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.concern_priority}
                    onChange={(e) => setFormData({ ...formData, concern_priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="routine">Routine</option>
                    <option value="monitor">Monitor</option>
                    <option value="urgent">Urgent - notify supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Describe concern
                  </label>
                  <textarea
                    value={formData.concern_description}
                    onChange={(e) => setFormData({ ...formData, concern_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What should the next caregiver or supervisor know?"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Care Log'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={submitting}
            className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Save as Draft
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center">
          This care log will be saved with timestamp, added to the resident's permanent record, and made available to the care team.
          {formData.has_concern && formData.concern_priority === 'urgent' && (
            <span className="text-orange-600 font-medium"> Urgent concerns will trigger supervisor notification.</span>
          )}
        </p>
      </form>
    </div>
  );
};
