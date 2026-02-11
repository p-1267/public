import React, { useEffect, useState } from 'react';
import { useShowcase } from '../../contexts/ShowcaseContext';
import { supabase } from '../../lib/supabase';
import { MedicationInteractionWarning } from '../MedicationInteractionWarning';

export function FamilyMedicationsPage() {
  const { selectedResidentId, isShowcaseMode } = useShowcase();
  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [administrationLog, setAdministrationLog] = useState<any[]>([]);

  useEffect(() => {
    loadMedicationsData();
  }, [selectedResidentId]);

  const loadMedicationsData = async () => {
    setLoading(true);
    try {
      let residentId = selectedResidentId;

      // If not in showcase mode, get resident from family links
      if (!isShowcaseMode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: links } = await supabase
          .from('family_resident_links')
          .select('resident_id, residents!inner(id, full_name)')
          .eq('family_user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (!links) {
          setLoading(false);
          return;
        }
        residentId = links.resident_id;
        setResident((links.residents as any));
      } else if (residentId) {
        // Fetch resident in showcase mode
        const { data: residentData } = await supabase
          .from('residents')
          .select('id, full_name')
          .eq('id', residentId)
          .maybeSingle();

        setResident(residentData);
      }

      if (!residentId) {
        setLoading(false);
        return;
      }

      // Fetch medications
      const { data: medsData } = await supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', residentId)
        .eq('is_active', true)
        .order('medication_name');

      setMedications(medsData || []);

      // Fetch administration log with caregiver names
      const { data: adminData } = await supabase
        .from('medication_administration_log')
        .select(`
          *,
          user_profiles(full_name)
        `)
        .eq('resident_id', residentId)
        .order('administered_at', { ascending: false })
        .limit(20);

      setAdministrationLog((adminData || []).map(log => ({
        ...log,
        administered_by_name: (log.user_profiles as any)?.full_name
      })));

    } catch (err) {
      console.error('Failed to load medications data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getAdherenceRate = () => {
    if (administrationLog.length === 0) return 100;
    const taken = administrationLog.filter(log => log.status === 'TAKEN').length;
    return Math.round((taken / administrationLog.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-2xl text-gray-600">Loading medications...</p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-2xl text-gray-600">No resident found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {resident?.full_name}'s Medications
          </h1>
          <p className="text-2xl text-gray-600">
            Monitor medications, interactions, and adherence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
            <div className="text-lg font-semibold text-blue-900 mb-2">Active Medications</div>
            <div className="text-5xl font-bold text-blue-600">{medications.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
            <div className="text-lg font-semibold text-green-900 mb-2">Adherence Rate</div>
            <div className="text-5xl font-bold text-green-600">{getAdherenceRate()}%</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
            <div className="text-lg font-semibold text-blue-900 mb-2">Last 7 Days</div>
            <div className="text-3xl font-bold text-blue-600">
              {administrationLog.filter((l: any) => {
                const logDate = new Date(l.administered_at);
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return logDate >= sevenDaysAgo && l.status === 'TAKEN';
              }).length} Doses Taken
            </div>
          </div>
        </div>

        {medications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Medication Interactions & Safety</h2>
            <MedicationInteractionWarning residentId={resident.id} medications={medications} />
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Current Medications</h2>
          {medications.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-12 text-center">
              <p className="text-2xl text-gray-500">No medications recorded</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {medications.map((med) => (
                <div key={med.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-400 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{med.medication_name}</h3>
                      <p className="text-lg text-gray-600">{med.dosage}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      med.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {med.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className="space-y-2 text-base text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Route:</span>
                      <span>{med.route || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Frequency:</span>
                      <span>{med.frequency || 'As directed'}</span>
                    </div>
                    {med.special_instructions && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="font-semibold text-yellow-900 mb-1">Special Instructions:</div>
                        <div className="text-yellow-800">{med.special_instructions}</div>
                      </div>
                    )}
                    {med.prescribing_physician && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-semibold">Prescribed by:</span>
                        <span>{med.prescribing_physician}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Recent Administration History</h2>
          {administrationLog.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-12 text-center">
              <p className="text-2xl text-gray-500">No administration history</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Medication</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Dosage</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Administered By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {administrationLog.map((log) => {
                      const medication = medications.find(m => m.id === log.medication_id);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-base text-gray-900">
                            {formatDate(log.administered_at)}<br />
                            <span className="text-sm text-gray-600">{formatTime(log.administered_at)}</span>
                          </td>
                          <td className="px-6 py-4 text-base font-medium text-gray-900">
                            {medication?.medication_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-base text-gray-700">
                            {log.dosage_given || medication?.dosage || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                              log.status === 'TAKEN'
                                ? 'bg-green-100 text-green-800'
                                : log.status === 'SKIPPED'
                                ? 'bg-yellow-100 text-yellow-800'
                                : log.status === 'REFUSED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-base text-gray-700">
                            {log.administered_by_name || 'Self-administered'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
          <h3 className="text-xl font-bold text-blue-900 mb-3">Family Admin Actions</h3>
          <p className="text-base text-blue-800 mb-4">
            As a family member, you can request changes to medications or report concerns. All changes require approval from the prescribing physician.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => alert('Medication change request submitted. The prescribing physician will be notified.')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              Request Medication Change
            </button>
            <button
              onClick={() => alert('Side effect report submitted. The care team will review and follow up.')}
              className="px-6 py-3 bg-white hover:bg-gray-50 text-blue-900 border-2 border-blue-300 rounded-xl font-semibold transition-colors"
            >
              Report Side Effect
            </button>
            <button
              onClick={() => alert('Refill request submitted. The pharmacy will be notified.')}
              className="px-6 py-3 bg-white hover:bg-gray-50 text-blue-900 border-2 border-blue-300 rounded-xl font-semibold transition-colors"
            >
              Request Refill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
