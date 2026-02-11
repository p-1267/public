import React, { useState, useEffect } from 'react';
import { useSeniorResident } from '../hooks/useSeniorResident';
import { useShowcase } from '../contexts/ShowcaseContext';
import { supabase } from '../lib/supabase';
import { MedicationInteractionWarning } from './MedicationInteractionWarning';
import { SHOWCASE_MODE } from '../config/showcase';

export function SeniorMedicationsPage() {
  const { resident: authResident } = useSeniorResident();
  const { selectedResidentId } = useShowcase();
  const [showcaseResident, setShowcaseResident] = useState<any>(null);
  const resident = SHOWCASE_MODE && selectedResidentId ? showcaseResident : authResident;
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [showSideEffectForm, setShowSideEffectForm] = useState(false);
  const [sideEffectText, setSideEffectText] = useState('');
  const [showAllMeds, setShowAllMeds] = useState(false);
  const [showAddMedForm, setShowAddMedForm] = useState(false);
  const [newMed, setNewMed] = useState({
    medication_name: '',
    dosage: '',
    dosage_unit: 'mg',
    frequency: 'Once daily',
    route: 'ORAL',
    special_instructions: ''
  });

  const frequencyOptions = [
    'As needed',
    'Once daily',
    'Twice daily',
    'Three times daily',
    'Four times daily',
    'Every 4 hours',
    'Every 6 hours',
    'Every 8 hours',
    'Every 12 hours',
    'Every morning',
    'Every evening',
    'Before meals',
    'After meals',
    'At bedtime',
    'Weekly',
    'Every other day'
  ];

  const dosageUnits = [
    'mg',
    'mcg',
    'g',
    'mL',
    'units',
    'IU',
    'drops',
    'puffs',
    'tablets',
    'capsules',
    'teaspoons',
    'tablespoons'
  ];

  const routeOptions = [
    { value: 'ORAL', label: 'By mouth (Oral)' },
    { value: 'TOPICAL', label: 'Applied to skin (Topical)' },
    { value: 'SUBLINGUAL', label: 'Under tongue (Sublingual)' },
    { value: 'INHALATION', label: 'Inhaled' },
    { value: 'INJECTION', label: 'Injection' },
    { value: 'TRANSDERMAL', label: 'Skin patch (Transdermal)' },
    { value: 'RECTAL', label: 'Rectal' },
    { value: 'OPHTHALMIC', label: 'Eye drops' },
    { value: 'OTIC', label: 'Ear drops' },
    { value: 'NASAL', label: 'Nasal spray' }
  ];

  useEffect(() => {
    if (SHOWCASE_MODE && selectedResidentId) {
      supabase
        .from('residents')
        .select('*')
        .eq('id', selectedResidentId)
        .maybeSingle()
        .then(({ data }) => setShowcaseResident(data));
    }
  }, [selectedResidentId]);

  useEffect(() => {
    if (resident?.id) {
      loadMedications();

      const channel = supabase
        .channel('medication-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'resident_medications',
            filter: `resident_id=eq.${resident.id}`
          },
          () => {
            console.log('[SeniorMedicationsPage] Medication update received');
            loadMedications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'medication_administration_log',
            filter: `resident_id=eq.${resident.id}`
          },
          () => {
            console.log('[SeniorMedicationsPage] Administration log update received');
            loadMedications();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [resident?.id]);

  const loadMedications = async () => {
    if (!resident?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', resident.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (err) {
      console.error('Failed to load medications:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">Loading...</p>
      </div>
    );
  }

  const handleMedicationTap = async (medId: string, status: 'TAKEN' | 'SKIPPED') => {
    if (!resident?.id) return;

    try {
      const { error } = await supabase
        .from('medication_administration_log')
        .insert({
          medication_id: medId,
          resident_id: resident.id,
          administered_by: resident.id, // Self-administration
          status: status,
          administered_at: new Date().toISOString(),
          notes: `Self-reported by ${resident.first_name}`,
          idempotency_key: `${resident.id}-${medId}-${new Date().toISOString().split('T')[0]}-${status}`
        });

      if (error) throw error;

      alert(`Medication marked as ${status}. Your family has been notified.`);
      loadMedications();
    } catch (err) {
      console.error('Failed to log medication:', err);
      alert('Failed to log medication. Please try again.');
    }
  };

  const handleReportSideEffect = async (medId: string) => {
    if (!sideEffectText || !resident?.id) return;

    try {
      // Create observation event for side effect
      const { error } = await supabase
        .from('observation_events')
        .insert({
          resident_id: resident.id,
          agency_id: resident.agency_id,
          caregiver_id: resident.id, // Self-reported
          event_type: 'medication_side_effect',
          event_subtype: 'self_reported',
          event_timestamp: new Date().toISOString(),
          event_data: {
            medication_id: medId,
            medication_name: selectedMed?.medication_name,
            side_effect_description: sideEffectText,
            severity: 'MODERATE' // Default, can be enhanced with severity selector
          },
          requires_followup: true
        });

      if (error) throw error;

      alert('Side effect report submitted. Your care team will be notified.');
      setShowSideEffectForm(false);
      setSideEffectText('');
      setSelectedMed(null);
    } catch (err) {
      console.error('Failed to report side effect:', err);
      alert('Failed to submit report. Please try again.');
    }
  };

  const handleRequestRefill = async (medId: string) => {
    if (!resident?.id) return;

    try {
      const medication = medications.find(m => m.id === medId);

      // Create observation event for refill request
      const { error } = await supabase
        .from('observation_events')
        .insert({
          resident_id: resident.id,
          agency_id: resident.agency_id,
          caregiver_id: resident.id, // Self-reported
          event_type: 'medication_refill_request',
          event_subtype: 'self_reported',
          event_timestamp: new Date().toISOString(),
          event_data: {
            medication_id: medId,
            medication_name: medication?.medication_name,
            requested_by: 'senior'
          },
          requires_followup: true
        });

      if (error) throw error;

      alert('Refill requested successfully. Your pharmacy will be contacted.');
    } catch (err) {
      console.error('Failed to request refill:', err);
      alert('Failed to request refill. Please try again.');
    }
  };

  const handleAddMedication = async () => {
    if (!resident?.id || !newMed.medication_name || !newMed.dosage) {
      alert('Please fill in medication name and dosage');
      return;
    }

    try {
      const fullDosage = `${newMed.dosage} ${newMed.dosage_unit}`;

      const { error } = await supabase
        .from('resident_medications')
        .insert([{
          resident_id: resident.id,
          medication_name: newMed.medication_name,
          dosage: fullDosage,
          frequency: newMed.frequency,
          route: newMed.route,
          special_instructions: newMed.special_instructions,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
          prescriber_name: 'Self-reported'
        }]);

      if (error) throw error;

      alert('Medication added successfully!');
      setShowAddMedForm(false);
      setNewMed({
        medication_name: '',
        dosage: '',
        dosage_unit: 'mg',
        frequency: 'Once daily',
        route: 'ORAL',
        special_instructions: ''
      });
      loadMedications();
    } catch (err) {
      console.error('Failed to add medication:', err);
      alert('Failed to add medication. Please try again.');
    }
  };

  const todaysMedications = medications;
  const displayMeds = showAllMeds ? medications : todaysMedications;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                My Medications
              </h1>
              <p className="text-2xl text-gray-600">
                Track your medications and report side effects
              </p>
            </div>
            <button
              onClick={() => setShowAddMedForm(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xl font-semibold transition-colors"
            >
              + Add Medication
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowAllMeds(false)}
            className={`flex-1 p-4 rounded-xl text-2xl font-semibold transition-colors ${
              !showAllMeds
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Today's Medications
          </button>
          <button
            onClick={() => setShowAllMeds(true)}
            className={`flex-1 p-4 rounded-xl text-2xl font-semibold transition-colors ${
              showAllMeds
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Medications
          </button>
        </div>

        {!loading && medications.length > 0 && (
          <div className="mb-8">
            <MedicationInteractionWarning residentId={resident.id} medications={medications} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        ) : displayMeds.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-3xl text-gray-500">No medications scheduled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayMeds.map((med) => (
              <MedicationCard
                key={med.id}
                medication={med}
                onTaken={() => handleMedicationTap(med.id, 'TAKEN')}
                onSkipped={() => handleMedicationTap(med.id, 'SKIPPED')}
                onReportSideEffect={() => {
                  setSelectedMed(med);
                  setShowSideEffectForm(true);
                }}
                onRequestRefill={() => handleRequestRefill(med.id)}
                onViewDetails={() => setSelectedMed(med)}
              />
            ))}
          </div>
        )}

        {showSideEffectForm && selectedMed && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Report Side Effect</h2>
              <p className="text-2xl text-gray-700 mb-6">Medication: {selectedMed.medication_name}</p>

              <textarea
                value={sideEffectText}
                onChange={(e) => setSideEffectText(e.target.value)}
                placeholder="Describe the side effect you're experiencing..."
                rows={6}
                className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none mb-6"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowSideEffectForm(false);
                    setSideEffectText('');
                    setSelectedMed(null);
                  }}
                  className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReportSideEffect(selectedMed.id)}
                  disabled={!sideEffectText}
                  className="flex-1 p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedMed && !showSideEffectForm && (
          <MedicationDetailModal
            medication={selectedMed}
            onClose={() => setSelectedMed(null)}
          />
        )}

        {showAddMedForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-8 max-w-2xl w-full">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Add New Medication</h2>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    value={newMed.medication_name}
                    onChange={(e) => setNewMed({ ...newMed, medication_name: e.target.value })}
                    placeholder="e.g., Aspirin, Vitamin D, Lisinopril"
                    className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">
                    Dosage *
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      placeholder="Amount"
                      step="0.1"
                      min="0"
                      className="flex-1 p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    <select
                      value={newMed.dosage_unit}
                      onChange={(e) => setNewMed({ ...newMed, dosage_unit: e.target.value })}
                      className="w-40 p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                    >
                      {dosageUnits.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Example: 81 mg, 2000 IU, 1 tablet</p>
                </div>

                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">
                    How Often (Frequency) *
                  </label>
                  <select
                    value={newMed.frequency}
                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                    className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                  >
                    {frequencyOptions.map(freq => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">
                    How to Take (Route) *
                  </label>
                  <select
                    value={newMed.route}
                    onChange={(e) => setNewMed({ ...newMed, route: e.target.value })}
                    className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                  >
                    {routeOptions.map(route => (
                      <option key={route.value} value={route.value}>{route.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xl font-semibold text-gray-700 mb-2">
                    Special Instructions
                  </label>
                  <textarea
                    value={newMed.special_instructions}
                    onChange={(e) => setNewMed({ ...newMed, special_instructions: e.target.value })}
                    placeholder="e.g., Take with food, Avoid grapefruit juice, Take in the morning"
                    rows={3}
                    className="w-full p-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowAddMedForm(false);
                    setNewMed({
                      medication_name: '',
                      dosage: '',
                      dosage_unit: 'mg',
                      frequency: 'Once daily',
                      route: 'ORAL',
                      special_instructions: ''
                    });
                  }}
                  className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-2xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMedication}
                  disabled={!newMed.medication_name || !newMed.dosage}
                  className="flex-1 p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-2xl font-semibold transition-colors"
                >
                  Add Medication
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MedicationCardProps {
  medication: any;
  onTaken: () => void;
  onSkipped: () => void;
  onReportSideEffect: () => void;
  onRequestRefill: () => void;
  onViewDetails: () => void;
}

function MedicationCard({
  medication,
  onTaken,
  onSkipped,
  onReportSideEffect,
  onRequestRefill,
  onViewDetails
}: MedicationCardProps) {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'TAKEN': return 'bg-green-100 text-green-800';
      case 'SKIPPED': return 'bg-yellow-100 text-yellow-800';
      case 'LATE': return 'bg-orange-100 text-orange-800';
      case 'MISSED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-3xl font-bold text-gray-900 mb-2">{medication.medication_name}</h3>
          <p className="text-2xl text-gray-700 mb-1">
            {medication.dosage}
          </p>
          {medication.frequency && (
            <p className="text-xl text-gray-600">
              {medication.frequency}
            </p>
          )}
        </div>
        {medication.last_administration_status && (
          <span className={`px-4 py-2 rounded-full text-lg font-semibold ${getStatusColor(medication.last_administration_status)}`}>
            {medication.last_administration_status}
          </span>
        )}
      </div>

      {medication.special_instructions && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-xl text-blue-800">{medication.special_instructions}</p>
        </div>
      )}

      {!medication.last_administration_status && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={onTaken}
            className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-2xl font-semibold transition-colors"
          >
            ✓ Taken
          </button>
          <button
            onClick={onSkipped}
            className="p-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-2xl font-semibold transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      <button
        onClick={() => setShowActions(!showActions)}
        className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xl font-semibold transition-colors"
      >
        {showActions ? 'Hide Options' : 'More Options'}
      </button>

      {showActions && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={onReportSideEffect}
            className="p-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-lg font-semibold transition-colors"
          >
            Report Side Effect
          </button>
          <button
            onClick={onRequestRefill}
            className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-xl text-lg font-semibold transition-colors"
          >
            Request Refill
          </button>
          <button
            onClick={onViewDetails}
            className="col-span-2 p-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-lg font-semibold transition-colors"
          >
            View Full Details
          </button>
        </div>
      )}
    </div>
  );
}

interface MedicationDetailModalProps {
  medication: any;
  onClose: () => void;
}

function MedicationDetailModal({ medication, onClose }: MedicationDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">{medication.medication_name}</h2>

        <div className="space-y-4 mb-8">
          <div>
            <p className="text-xl font-semibold text-gray-700">Dosage</p>
            <p className="text-2xl text-gray-900">{medication.dosage}</p>
          </div>

          {medication.frequency && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Frequency</p>
              <p className="text-2xl text-gray-900">{medication.frequency}</p>
            </div>
          )}

          {medication.route && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Route</p>
              <p className="text-2xl text-gray-900">{medication.route}</p>
            </div>
          )}

          {medication.special_instructions && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Instructions</p>
              <p className="text-2xl text-gray-900">{medication.special_instructions}</p>
            </div>
          )}

          {medication.prescriber_name && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Prescribed By</p>
              <p className="text-2xl text-gray-900">{medication.prescriber_name}</p>
            </div>
          )}

          {medication.start_date && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Start Date</p>
              <p className="text-2xl text-gray-900">
                {new Date(medication.start_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {medication.end_date && (
            <div>
              <p className="text-xl font-semibold text-gray-700">End Date</p>
              <p className="text-2xl text-gray-900">
                {new Date(medication.end_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {medication.indication && (
            <div>
              <p className="text-xl font-semibold text-gray-700">Purpose</p>
              <p className="text-2xl text-gray-900">{medication.indication}</p>
            </div>
          )}

          {medication.side_effects_to_monitor && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <p className="text-xl font-semibold text-yellow-800 mb-2">Possible Side Effects to Monitor</p>
              <p className="text-lg text-yellow-700">{medication.side_effects_to_monitor}</p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-2xl font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
