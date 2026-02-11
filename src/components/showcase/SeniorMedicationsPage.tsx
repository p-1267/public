import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';

interface ScheduledMedication {
  schedule_id: string;
  medication_id: string;
  medication_name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  expected_at: string;
  status: string;
  completed_at: string | null;
  last_taken: string | null;
  special_instructions: string | null;
}

interface PRNMedication {
  medication_id: string;
  medication_name: string;
  dosage: string;
  route: string;
  indication: string | null;
  special_instructions: string | null;
  last_taken: string | null;
}

interface MedicationData {
  scheduled: ScheduledMedication[];
  prn: PRNMedication[];
  date: string;
}

export const SeniorMedicationsPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [medications, setMedications] = useState<MedicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [residentId, setResidentId] = useState<string | null>(null);

  const [prnForm, setPrnForm] = useState({
    medication_id: '',
    notes: '',
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
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

      const { data, error: rpcError } = await supabase.rpc('get_senior_medications', {
        p_resident_id: link.resident_id,
        p_is_simulation: isShowcaseMode,
      });

      if (rpcError) throw rpcError;

      setMedications(data as MedicationData);
    } catch (err) {
      console.error('Error loading medications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async (scheduleId: string, medicationId: string, medicationName: string) => {
    if (!residentId) return;

    try {
      setSubmitting(scheduleId);
      setError(null);

      const idempotencyKey = `med-${scheduleId}-${Date.now()}`;

      const { data, error: logError } = await supabase.rpc('senior_log_medication_taken', {
        p_resident_id: residentId,
        p_medication_id: medicationId,
        p_schedule_id: scheduleId,
        p_notes: null,
        p_idempotency_key: idempotencyKey,
        p_is_simulation: isShowcaseMode,
      });

      if (logError) throw logError;

      setSuccess(`${medicationName} marked as taken`);
      setTimeout(() => setSuccess(null), 3000);

      await loadMedications();
    } catch (err) {
      console.error('Error logging medication:', err);
      setError(err instanceof Error ? err.message : 'Failed to log medication');
    } finally {
      setSubmitting(null);
    }
  };

  const handleLogPRN = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!residentId || !prnForm.medication_id) return;

    const selectedMed = medications?.prn.find(m => m.medication_id === prnForm.medication_id);
    if (!selectedMed) return;

    try {
      setSubmitting('prn');
      setError(null);

      const idempotencyKey = `prn-${prnForm.medication_id}-${Date.now()}`;

      const { data, error: logError } = await supabase.rpc('senior_log_medication_taken', {
        p_resident_id: residentId,
        p_medication_id: prnForm.medication_id,
        p_schedule_id: null,
        p_notes: prnForm.notes || null,
        p_idempotency_key: idempotencyKey,
        p_is_simulation: isShowcaseMode,
      });

      if (logError) throw logError;

      setSuccess(`${selectedMed.medication_name} logged successfully`);
      setPrnForm({ medication_id: '', notes: '' });
      setTimeout(() => setSuccess(null), 3000);

      await loadMedications();
    } catch (err) {
      console.error('Error logging PRN medication:', err);
      setError(err instanceof Error ? err.message : 'Failed to log PRN medication');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading medications...</div>
        </div>
      </div>
    );
  }

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Medications</h1>
        <p className="text-gray-600 mt-1">
          View your medication schedule and mark when you've taken your medications. Your caregiver can see your updates.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Scheduled Medications */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Medications Due Today</h2>
        <p className="text-sm text-gray-600 mb-4">
          These medications are scheduled for today. Check them off as you take them.
        </p>

        {medications?.scheduled && medications.scheduled.length > 0 ? (
          <div className="space-y-3">
            {medications.scheduled.map((med) => (
              <div
                key={med.schedule_id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">
                      {med.medication_name} {med.dosage}
                    </h3>
                    {med.status === 'COMPLETED' && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✓ Taken
                      </span>
                    )}
                    {med.status === 'PENDING' && new Date(med.expected_at) < new Date() && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Scheduled for: {formatTime(med.expected_at)}
                  </p>
                  {med.special_instructions && (
                    <p className="text-sm text-gray-500 mt-1 italic">
                      {med.special_instructions}
                    </p>
                  )}
                  {med.completed_at && (
                    <p className="text-sm text-green-600 mt-1">
                      Taken at: {formatTime(med.completed_at)}
                    </p>
                  )}
                </div>

                {med.status === 'PENDING' && (
                  <button
                    onClick={() => handleMarkTaken(med.schedule_id, med.medication_id, med.medication_name)}
                    disabled={submitting === med.schedule_id}
                    className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting === med.schedule_id ? 'Marking...' : 'I took this'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No scheduled medications for today</p>
        )}
      </div>

      {/* PRN Medications */}
      {medications?.prn && medications.prn.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">PRN (As Needed) Medications</h2>
          <p className="text-sm text-gray-600 mb-4">
            Take these only when needed. Log each time you take them.
          </p>

          <div className="space-y-3 mb-6">
            {medications.prn.map((med) => (
              <div
                key={med.medication_id}
                className="p-4 border border-gray-200 rounded-md"
              >
                <h3 className="font-medium text-gray-900">
                  {med.medication_name} {med.dosage}
                </h3>
                {med.indication && (
                  <p className="text-sm text-gray-600 mt-1">For: {med.indication}</p>
                )}
                {med.special_instructions && (
                  <p className="text-sm text-gray-500 mt-1 italic">
                    {med.special_instructions}
                  </p>
                )}
                {med.last_taken && (
                  <p className="text-sm text-green-600 mt-1">
                    Last taken: {formatTime(med.last_taken)}
                  </p>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleLogPRN} className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-4">Log PRN Medication</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Which medication? *
                </label>
                <select
                  value={prnForm.medication_id}
                  onChange={(e) => setPrnForm({ ...prnForm, medication_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a medication</option>
                  {medications.prn.map((med) => (
                    <option key={med.medication_id} value={med.medication_id}>
                      {med.medication_name} {med.dosage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Why did you take it?
                </label>
                <textarea
                  value={prnForm.notes}
                  onChange={(e) => setPrnForm({ ...prnForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Headache, pain, etc."
                />
              </div>

              <button
                type="submit"
                disabled={submitting === 'prn' || !prnForm.medication_id}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {submitting === 'prn' ? 'Logging...' : 'Log PRN Medication'}
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="text-sm text-gray-500 text-center">
        Your medication log is saved and your caregiver will be notified of your updates.
      </p>
    </div>
  );
};
