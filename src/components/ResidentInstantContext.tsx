import React, { useState } from 'react';
import { ResidentInstantContext as ContextType, AccessValidationResult } from '../hooks/useResidentInstantContext';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { BrainBlockModal } from './BrainBlockModal';
import { ResidentCareStateSummaryCard } from './ResidentCareStateSummaryCard';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { useResidentCareState } from '../hooks/useResidentCareState';
import { residentCareStateService } from '../services/residentCareStateService';

interface ResidentInstantContextProps {
  context: ContextType;
  accessResult: AccessValidationResult;
  onClose: () => void;
}

type ActionMode = 'vitals' | 'prn' | 'note' | null;

export function ResidentInstantContext({ context, accessResult, onClose }: ResidentInstantContextProps) {
  const { resident, last_medications, last_vitals, recent_visits, active_signals } = context;
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [blockingRule, setBlockingRule] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const { state: careState, refresh: refreshCareState } = useResidentCareState(resident.id);

  const formatTimeAgo = (minutes: number) => {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${Math.floor(minutes)} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${Math.floor(minutes % 60)}m ago`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {resident.first_name} {resident.last_name}
            </h2>
            <p className="text-sm text-gray-600">
              Room {resident.room_number} • {resident.care_level}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {accessResult.duplicate_visit_detected && (
          <div className="mx-6 mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  Resident checked {formatTimeAgo(accessResult.last_visit_minutes_ago || 0)} — Consider if duplicate visit is necessary
                </p>
              </div>
            </div>
          </div>
        )}

        {!accessResult.duplicate_visit_detected && recent_visits.length > 0 && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Last visit: {formatTimeAgo(recent_visits[0].minutes_ago)} by {recent_visits[0].accessed_by}
                </p>
              </div>
            </div>
          </div>
        )}

        {careState && (
          <div className="mx-6 mt-4">
            <ResidentCareStateSummaryCard state={careState} compact={true} />
          </div>
        )}

        <div className="p-6 space-y-6">
          {active_signals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Intelligence Signals</h3>
              <div className="space-y-2">
                {active_signals.map((signal, idx) => (
                  <div
                    key={idx}
                    className={`p-3 border rounded-lg ${getSeverityColor(signal.severity)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm uppercase tracking-wide">{signal.signal_type}</p>
                        <p className="mt-1 text-sm">{signal.message}</p>
                      </div>
                      <span className="ml-2 px-2 py-1 text-xs font-semibold rounded bg-white bg-opacity-60">
                        {signal.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {last_medications.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Medications (24h)</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {last_medications.map((med, idx) => (
                  <div key={idx} className="flex justify-between items-start border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{med.medication_name}</p>
                      <p className="text-sm text-gray-600">By {med.administered_by}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(med.administered_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className={`text-xs font-medium ${
                        med.status === 'completed' ? 'text-green-600' :
                        med.status === 'refused' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {med.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {last_vitals && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Last Vital Signs</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Heart Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{last_vitals.heart_rate} bpm</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Blood Pressure</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {last_vitals.blood_pressure_systolic}/{last_vitals.blood_pressure_diastolic}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Temperature</p>
                    <p className="text-lg font-semibold text-gray-900">{last_vitals.temperature}°F</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">O₂ Saturation</p>
                    <p className="text-lg font-semibold text-gray-900">{last_vitals.oxygen_saturation}%</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Recorded</p>
                    <p className="text-sm text-gray-900">
                      {new Date(last_vitals.recorded_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {recent_visits.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Access History</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {recent_visits.map((visit, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{visit.accessed_by}</p>
                      <p className="text-xs text-gray-500 capitalize">{visit.access_method.replace('_', ' ')}</p>
                    </div>
                    <p className="text-gray-600">{formatTimeAgo(visit.minutes_ago)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {actionMode === null && (
          <div className="sticky bottom-0 bg-white border-t px-6 py-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActionMode('vitals')}
                  className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 font-medium transition-colors border border-blue-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                  </svg>
                  Record Vitals
                </button>
                <button
                  onClick={() => setActionMode('prn')}
                  className="flex items-center justify-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 font-medium transition-colors border border-green-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  PRN Medication
                </button>
                <button
                  onClick={() => setActionMode('note')}
                  className="flex items-center justify-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 font-medium transition-colors border border-purple-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Log Note
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {actionMode === 'vitals' && (
          <VitalsForm
            residentId={resident.id}
            onClose={() => setActionMode(null)}
            onSuccess={() => {
              refreshCareState();
              setActionMode(null);
              alert('Vitals recorded successfully');
            }}
            onDuplicateWarning={setDuplicateWarning}
          />
        )}
        {actionMode === 'prn' && (
          <PRNForm
            residentId={resident.id}
            onClose={() => setActionMode(null)}
            onSuccess={() => {
              refreshCareState();
              setActionMode(null);
              alert('PRN medication logged');
            }}
          />
        )}
        {actionMode === 'note' && (
          <NoteForm
            residentId={resident.id}
            onClose={() => setActionMode(null)}
            onSuccess={() => {
              refreshCareState();
              setActionMode(null);
              alert('Care note saved');
            }}
          />
        )}
      </div>

      {blockingRule && (
        <BrainBlockModal
          rule={blockingRule}
          onClose={() => setBlockingRule(null)}
        />
      )}

      {duplicateWarning && (
        <DuplicateWarningModal
          actionType={duplicateWarning.actionType}
          lastAction={duplicateWarning.lastAction}
          onProceed={(reason) => {
            duplicateWarning.onProceed(reason);
            setDuplicateWarning(null);
          }}
          onCancel={() => setDuplicateWarning(null)}
        />
      )}
    </div>
  );
}

function VitalsForm({
  residentId,
  onClose,
  onSuccess,
  onDuplicateWarning
}: {
  residentId: string;
  onClose: () => void;
  onSuccess: () => void;
  onDuplicateWarning: (warning: any) => void;
}) {
  const [vitals, setVitals] = useState({
    heart_rate: '',
    bp_systolic: '',
    bp_diastolic: '',
    temperature: '',
    oxygen_sat: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [overrideReason, setOverrideReason] = useState<string | null>(null);

  const recordVitals = async (reason?: string) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('vital_signs_simple').insert({
        resident_id: residentId,
        recorded_by: user?.id,
        heart_rate: parseInt(vitals.heart_rate),
        blood_pressure_systolic: parseInt(vitals.bp_systolic),
        blood_pressure_diastolic: parseInt(vitals.bp_diastolic),
        temperature: parseFloat(vitals.temperature),
        oxygen_saturation: parseInt(vitals.oxygen_sat)
      });

      if (error) throw error;

      if (reason) {
        await supabase.from('audit_log').insert({
          user_id: user?.id,
          action: 'duplicate_override',
          table_name: 'vital_signs_simple',
          record_id: residentId,
          details: { reason, action_type: 'vitals' }
        });
      }

      onSuccess();
    } catch (err: any) {
      alert(`Failed to record vitals: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (SHOWCASE_MODE) {
      alert('Showcase Mode: Vitals recording blocked');
      return;
    }

    const duplicateCheck = await residentCareStateService.checkDuplicateAction(
      residentId,
      'vitals'
    );

    if (duplicateCheck.isDuplicate) {
      onDuplicateWarning({
        actionType: 'vitals',
        lastAction: duplicateCheck.lastAction,
        onProceed: (reason: string) => {
          recordVitals(reason);
        }
      });
    } else {
      recordVitals();
    }
  };

  return (
    <div className="sticky bottom-0 bg-white border-t px-6 py-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">Record Vital Signs</p>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Heart Rate (bpm)"
            value={vitals.heart_rate}
            onChange={(e) => setVitals({ ...vitals, heart_rate: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="number"
            placeholder="O₂ Sat (%)"
            value={vitals.oxygen_sat}
            onChange={(e) => setVitals({ ...vitals, oxygen_sat: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="number"
            placeholder="BP Systolic"
            value={vitals.bp_systolic}
            onChange={(e) => setVitals({ ...vitals, bp_systolic: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="number"
            placeholder="BP Diastolic"
            value={vitals.bp_diastolic}
            onChange={(e) => setVitals({ ...vitals, bp_diastolic: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="number"
            step="0.1"
            placeholder="Temp (°F)"
            value={vitals.temperature}
            onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
            required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Recording...' : 'Record Vitals'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function PRNForm({ residentId, onClose, onSuccess }: { residentId: string; onClose: () => void; onSuccess: () => void }) {
  const [prnMeds, setPrnMeds] = useState<any[]>([]);
  const [selectedMed, setSelectedMed] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastDoses, setLastDoses] = useState<Record<string, any>>({});

  React.useEffect(() => {
    const loadPRNMeds = async () => {
      const { data: meds } = await supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', residentId)
        .eq('is_prn', true)
        .eq('is_active', true);

      if (meds && meds.length > 0) {
        const medIds = meds.map(m => m.id);
        const { data: lastDoseData } = await supabase
          .from('medication_administration')
          .select('medication_id, administered_at')
          .eq('resident_id', residentId)
          .in('medication_id', medIds)
          .order('administered_at', { ascending: false });

        const lastDoseMap: Record<string, any> = {};
        lastDoseData?.forEach(dose => {
          if (!lastDoseMap[dose.medication_id]) {
            lastDoseMap[dose.medication_id] = dose;
          }
        });
        setLastDoses(lastDoseMap);
      }

      setPrnMeds(meds || []);
      setLoading(false);
    };
    loadPRNMeds();
  }, [residentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (SHOWCASE_MODE) {
      alert('Showcase Mode: PRN administration blocked');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const med = prnMeds.find(m => m.id === selectedMed);

      const { error } = await supabase.from('medication_administration').insert({
        resident_id: residentId,
        medication_id: selectedMed,
        administered_by: user?.id,
        status: 'TAKEN',
        dosage_given: med?.dosage,
        route_used: med?.route
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert(`Failed to log PRN: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getLastDoseInfo = (medId: string, minInterval: number = 4) => {
    const lastDose = lastDoses[medId];
    if (!lastDose) return null;

    const lastDoseTime = new Date(lastDose.administered_at);
    const now = new Date();
    const hoursSince = (now.getTime() - lastDoseTime.getTime()) / (1000 * 60 * 60);
    const hoursUntilNext = Math.max(0, minInterval - hoursSince);

    return {
      lastDoseTime,
      hoursSince,
      hoursUntilNext,
      canAdminister: hoursSince >= minInterval
    };
  };

  const selectedMedData = prnMeds.find(m => m.id === selectedMed);
  const doseInfo = selectedMedData ? getLastDoseInfo(selectedMedData.id, selectedMedData.min_interval_hours || 4) : null;

  return (
    <div className="sticky bottom-0 bg-white border-t px-6 py-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">Administer PRN Medication</p>
        {loading ? (
          <p className="text-sm text-gray-500">Loading PRN medications...</p>
        ) : prnMeds.length === 0 ? (
          <p className="text-sm text-gray-500">No PRN medications available for this resident</p>
        ) : (
          <>
            <select
              value={selectedMed}
              onChange={(e) => setSelectedMed(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select PRN medication...</option>
              {prnMeds.map(med => {
                const info = getLastDoseInfo(med.id, med.min_interval_hours || 4);
                return (
                  <option key={med.id} value={med.id}>
                    {med.medication_name} - {med.dosage} ({med.prn_reason})
                    {info && !info.canAdminister ? ` - Wait ${Math.ceil(info.hoursUntilNext)}h` : ''}
                  </option>
                );
              })}
            </select>

            {selectedMed && doseInfo && (
              <div className={`p-3 rounded-lg text-sm ${doseInfo.canAdminister ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-300'}`}>
                <p className={`font-medium ${doseInfo.canAdminister ? 'text-green-800' : 'text-yellow-800'}`}>
                  Last dose: {doseInfo.lastDoseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  {' '}({Math.floor(doseInfo.hoursSince)}h {Math.floor((doseInfo.hoursSince % 1) * 60)}m ago)
                </p>
                {!doseInfo.canAdminister && (
                  <p className="text-yellow-700 text-xs mt-1">
                    Minimum interval: {selectedMedData?.min_interval_hours || 4}h • {Math.ceil(doseInfo.hoursUntilNext)}h remaining
                  </p>
                )}
              </div>
            )}

            {selectedMed && !doseInfo && (
              <div className="p-3 rounded-lg text-sm bg-blue-50 border border-blue-200">
                <p className="text-blue-800 font-medium">No previous doses on record</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !selectedMed || (doseInfo && !doseInfo.canAdminister)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? 'Logging...' : 'Administer PRN'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function NoteForm({ residentId, onClose, onSuccess }: { residentId: string; onClose: () => void; onSuccess: () => void }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (SHOWCASE_MODE) {
      alert('Showcase Mode: Care note blocked');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('audit_log').insert({
        user_id: user?.id,
        action: 'care_note',
        table_name: 'residents',
        record_id: residentId,
        details: { note, source: 'instant_context' }
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sticky bottom-0 bg-white border-t px-6 py-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">Log Care Note</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter care note..."
          required
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Note'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
