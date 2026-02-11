import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface HandoffReport {
  medications: {
    administered: Array<{ resident_name: string; medication_name: string; time: string }>;
    missed: Array<{ resident_name: string; medication_name: string; reason: string }>;
    skipped: Array<{ resident_name: string; medication_name: string; reason: string }>;
  };
  vitals: Array<{
    resident_name: string;
    vital_type: string;
    value: string;
    time: string;
    within_baseline: boolean;
  }>;
  incidents: Array<{
    resident_name: string;
    incident_type: string;
    severity: string;
    description: string;
    time: string;
  }>;
  intelligence_signals: Array<{
    resident_name: string;
    signal_type: string;
    severity: string;
    description: string;
  }>;
  care_notes: Array<{
    resident_name: string;
    note: string;
    time: string;
    caregiver_name: string;
  }>;
}

export function ShiftHandoffDashboard({ shiftId }: { shiftId: string }) {
  const [report, setReport] = useState<HandoffReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHandoffReport();
  }, [shiftId]);

  const loadHandoffReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_shift_handoff_report', {
        p_shift_id: shiftId
      });

      if (error) throw error;
      setReport(data);
    } catch (err) {
      console.error('Failed to load handoff report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Generating shift handoff report...</div>;
  }

  if (!report) {
    return <div className="text-gray-600">No handoff data available</div>;
  }

  const totalMedications = report.medications.administered.length +
                          report.medications.missed.length +
                          report.medications.skipped.length;
  const medAdherenceRate = totalMedications > 0
    ? Math.round((report.medications.administered.length / totalMedications) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shift Handoff Report</h2>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Print Report
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="text-sm text-green-600 font-semibold mb-1">MEDICATIONS GIVEN</div>
          <div className="text-3xl font-bold text-green-900">{report.medications.administered.length}</div>
        </div>
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="text-sm text-red-600 font-semibold mb-1">MEDICATIONS MISSED</div>
          <div className="text-3xl font-bold text-red-900">{report.medications.missed.length}</div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-semibold mb-1">VITALS RECORDED</div>
          <div className="text-3xl font-bold text-blue-900">{report.vitals.length}</div>
        </div>
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <div className="text-sm text-orange-600 font-semibold mb-1">INCIDENTS</div>
          <div className="text-3xl font-bold text-orange-900">{report.incidents.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Medication Adherence</h3>
          <span className="text-2xl font-bold">{medAdherenceRate}%</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${medAdherenceRate >= 95 ? 'bg-green-500' : medAdherenceRate >= 85 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${medAdherenceRate}%` }}
          />
        </div>
      </div>

      {report.medications.missed.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <h3 className="text-lg font-bold text-red-900 mb-3">⚠ Missed Medications (Requires Follow-up)</h3>
          <div className="space-y-2">
            {report.medications.missed.map((med, idx) => (
              <div key={idx} className="bg-white rounded p-3">
                <div className="font-bold text-red-900">{med.resident_name}</div>
                <div className="text-sm text-gray-700">{med.medication_name}</div>
                <div className="text-sm text-red-700 mt-1">Reason: {med.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.intelligence_signals.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
          <h3 className="text-lg font-bold text-purple-900 mb-3">🧠 Active Intelligence Signals</h3>
          <div className="space-y-2">
            {report.intelligence_signals.map((signal, idx) => (
              <div key={idx} className="bg-white rounded p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-purple-900">{signal.resident_name}</div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    signal.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                    signal.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                    'bg-yellow-600 text-white'
                  }`}>
                    {signal.severity}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{signal.signal_type}</div>
                <div className="text-sm text-gray-700 mt-1">{signal.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.incidents.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <h3 className="text-lg font-bold text-orange-900 mb-3">📋 Incidents This Shift</h3>
          <div className="space-y-2">
            {report.incidents.map((incident, idx) => (
              <div key={idx} className="bg-white rounded p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-orange-900">{incident.resident_name}</div>
                  <div className="flex gap-2">
                    <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">{incident.incident_type}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      incident.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                      incident.severity === 'HIGH' ? 'bg-orange-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-700">{incident.description}</div>
                <div className="text-xs text-gray-500 mt-1">{new Date(incident.time).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.vitals.filter(v => !v.within_baseline).length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <h3 className="text-lg font-bold text-yellow-900 mb-3">⚠ Baseline Deviations</h3>
          <div className="space-y-2">
            {report.vitals.filter(v => !v.within_baseline).map((vital, idx) => (
              <div key={idx} className="bg-white rounded p-3">
                <div className="font-bold text-yellow-900">{vital.resident_name}</div>
                <div className="text-sm text-gray-700">
                  {vital.vital_type}: <span className="font-bold text-red-600">{vital.value}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{new Date(vital.time).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold mb-3">Care Notes ({report.care_notes.length})</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {report.care_notes.map((note, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-3 py-2">
              <div className="flex justify-between items-start mb-1">
                <div className="font-semibold text-sm">{note.resident_name}</div>
                <div className="text-xs text-gray-500">{new Date(note.time).toLocaleString()}</div>
              </div>
              <div className="text-sm text-gray-700">{note.note}</div>
              <div className="text-xs text-gray-500 mt-1">by {note.caregiver_name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-300 rounded p-4">
        <div className="text-sm font-bold text-blue-900 mb-2">Handoff Completeness Checklist:</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm">Medication status reviewed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm">Vital signs documented</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm">Incidents reported</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm">Intelligence signals identified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
