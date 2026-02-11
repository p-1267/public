import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
}

interface Medication {
  id: string;
  medication_name: string;
  dosage: string;
  route: string;
}

interface MedicationLogForm {
  resident_id: string;
  medication_id: string;
  dosage_given: string;
  time_given: string;
  status: string;
  route_used: string;
  resident_response: string;
  notes: string;
  verified: boolean;
}

export const CaregiverMedicationsPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<MedicationLogForm>({
    resident_id: '',
    medication_id: '',
    dosage_given: '',
    time_given: new Date().toTimeString().substring(0, 5),
    status: 'TAKEN',
    route_used: 'oral_swallowed',
    resident_response: 'took_without_issue',
    notes: '',
    verified: false,
  });

  useEffect(() => {
    loadResidents();
  }, []);

  useEffect(() => {
    if (formData.resident_id) {
      loadMedicationsForResident(formData.resident_id);
    } else {
      setMedications([]);
    }
  }, [formData.resident_id]);

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

  const loadMedicationsForResident = async (residentId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('resident_medications')
        .select('id, medication_name, dosage, route')
        .eq('resident_id', residentId)
        .eq('status', 'active')
        .order('medication_name', { ascending: true });

      if (fetchError) throw fetchError;

      setMedications(data || []);
    } catch (err) {
      console.error('Error loading medications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load medications');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.resident_id) {
      setError('Please select a resident');
      return;
    }

    if (!formData.medication_id) {
      setError('Please select a medication');
      return;
    }

    if (!formData.verified) {
      setError('Please verify medication name, dosage, and resident identity');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      const today = new Date().toISOString().split('T')[0];
      const administeredTimestamp = new Date(`${today}T${formData.time_given}:00`);

      const { data, error: submitError } = await supabase
        .from('medication_administration_log')
        .insert({
          medication_id: formData.medication_id,
          resident_id: formData.resident_id,
          administered_by: profile.id,
          administered_at: administeredTimestamp.toISOString(),
          status: formData.status,
          dosage_given: formData.dosage_given,
          route_used: formData.route_used,
          resident_response: formData.notes,
          notes: formData.notes,
          language_context: 'en',
          is_simulation: isShowcaseMode,
        })
        .select()
        .single();

      if (submitError) throw submitError;

      setSuccess(true);

      setFormData({
        resident_id: formData.resident_id,
        medication_id: '',
        dosage_given: '',
        time_given: new Date().toTimeString().substring(0, 5),
        status: 'TAKEN',
        route_used: 'oral_swallowed',
        resident_response: 'took_without_issue',
        notes: '',
        verified: false,
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error submitting medication log:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit medication log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setFormData({
      resident_id: '',
      medication_id: '',
      dosage_given: '',
      time_given: new Date().toTimeString().substring(0, 5),
      status: 'TAKEN',
      route_used: 'oral_swallowed',
      resident_response: 'took_without_issue',
      notes: '',
      verified: false,
    });
    setError(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Medication Administration</h1>
        <p className="text-gray-600 mt-1">
          Log medications given to residents during your shift. All entries are timestamped and recorded in the resident's care record.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Medication administration logged successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Resident</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resident *
            </label>
            <select
              value={formData.resident_id}
              onChange={(e) => setFormData({ ...formData, resident_id: e.target.value, medication_id: '' })}
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
        </div>

        {formData.resident_id && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Medication Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name *
                </label>
                <select
                  value={formData.medication_id}
                  onChange={(e) => {
                    const med = medications.find(m => m.id === e.target.value);
                    setFormData({
                      ...formData,
                      medication_id: e.target.value,
                      dosage_given: med?.dosage || '',
                      route_used: med?.route || 'oral_swallowed',
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a medication</option>
                  {medications.map((medication) => (
                    <option key={medication.id} value={medication.id}>
                      {medication.medication_name} {medication.dosage}
                    </option>
                  ))}
                </select>
                {medications.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">No active medications found for this resident</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage *
                </label>
                <input
                  type="text"
                  value={formData.dosage_given}
                  onChange={(e) => setFormData({ ...formData, dosage_given: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10mg, 1 tablet"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Given *
                </label>
                <input
                  type="time"
                  value={formData.time_given}
                  onChange={(e) => setFormData({ ...formData, time_given: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="TAKEN">Given as prescribed</option>
                  <option value="LATE">Given late</option>
                  <option value="REFUSED">Refused by resident</option>
                  <option value="MISSED">Not available</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {formData.medication_id && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Administration Notes</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How was it taken?
                  </label>
                  <select
                    value={formData.route_used}
                    onChange={(e) => setFormData({ ...formData, route_used: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="oral_swallowed">Oral - swallowed</option>
                    <option value="oral_dissolved">Oral - dissolved</option>
                    <option value="topical">Topical</option>
                    <option value="injectable">Injectable</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resident response
                  </label>
                  <select
                    value={formData.resident_response}
                    onChange={(e) => setFormData({ ...formData, resident_response: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="took_without_issue">Took without issue</option>
                    <option value="needed_assistance">Needed assistance</option>
                    <option value="expressed_concern">Expressed concern</option>
                    <option value="refused">Refused</option>
                  </select>
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
                    placeholder="Any concerns, side effects, or observations..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification</h2>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="verified"
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  required
                />
                <label htmlFor="verified" className="ml-2 block text-sm text-gray-700">
                  I verified the medication name, dosage, and resident identity <span className="text-red-600">*</span>
                </label>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !formData.medication_id}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Medication Log'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={submitting}
            className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Clear Form
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center">
          The medication administration will be recorded, timestamped, and added to the resident's permanent care record.
        </p>
      </form>
    </div>
  );
};
