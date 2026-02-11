import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrainOutputPanel } from './BrainOutputPanel';
import { BrainOutputService } from '../services/brainOutputService';

interface ShiftHandoffViewProps {
  onClose: () => void;
}

interface HandoffData {
  shift_period: {
    start: string;
    end: string;
  };
  medications: any[];
  vitals: any[];
  incidents: any[];
  active_signals: any[];
  care_notes: any[];
}

export function ShiftHandoffView({ onClose }: ShiftHandoffViewProps) {
  const [data, setData] = useState<HandoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shiftTimes, setShiftTimes] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    const loadHandoffData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const shiftEnd = new Date();
        const shiftStart = new Date(shiftEnd.getTime() - 8 * 60 * 60 * 1000);

        setShiftTimes({ start: shiftStart, end: shiftEnd });

        const { data: reportData, error: rpcError } = await supabase.rpc('get_shift_handoff_report', {
          p_caregiver_id: user.id,
          p_shift_start: shiftStart.toISOString(),
          p_shift_end: shiftEnd.toISOString()
        });

        if (rpcError) throw rpcError;

        setData(reportData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadHandoffData();
  }, []);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <p className="text-gray-700">Loading shift handoff report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <h3 className="text-lg font-bold text-red-700 mb-2">Error Loading Report</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Shift Handoff Report</h2>
            <p className="text-sm text-blue-100">
              {formatDate(data?.shift_period.start || '')} {formatTime(data?.shift_period.start || '')} - {formatTime(data?.shift_period.end || '')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {shiftTimes && (
            <BrainOutputPanel
              context={{
                agencyId: undefined,
                windowHours: 8
              }}
              title="What Changed Since Last Shift"
              compact={false}
            />
          )}

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <p className="text-sm text-blue-800 font-medium">
              This report summarizes all care activities during the previous shift. Review carefully before starting your shift.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Medications ({data?.medications?.length || 0})
            </h3>
            {data?.medications && data.medications.length > 0 ? (
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {data.medications.map((med, idx) => (
                  <div key={idx} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{med.resident_name}</p>
                      <p className="text-sm text-gray-600">{med.medication}</p>
                      <p className="text-xs text-gray-500">By {med.administered_by}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">{formatTime(med.administered_at)}</p>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        med.status === 'TAKEN' ? 'bg-green-100 text-green-800' :
                        med.status === 'MISSED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {med.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">No medications administered this shift</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
              </svg>
              Vital Signs ({data?.vitals?.length || 0})
            </h3>
            {data?.vitals && data.vitals.length > 0 ? (
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {data.vitals.map((vital, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-900">{vital.resident_name}</p>
                      <p className="text-sm text-gray-600">{formatTime(vital.recorded_at)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">HR</p>
                        <p className="font-semibold text-gray-900">{vital.heart_rate} bpm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">BP</p>
                        <p className="font-semibold text-gray-900">{vital.blood_pressure}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Temp</p>
                        <p className="font-semibold text-gray-900">{vital.temperature}°F</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">By {vital.recorded_by}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">No vitals recorded this shift</p>
            )}
          </div>

          {data?.incidents && data.incidents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Incidents ({data.incidents.length})
              </h3>
              <div className="bg-red-50 rounded-lg divide-y divide-red-100">
                {data.incidents.map((incident, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-red-900">{incident.resident_name}</p>
                      <p className="text-sm text-red-700">{formatTime(incident.created_at)}</p>
                    </div>
                    <p className="text-sm text-red-800 font-medium uppercase">{incident.action.replace('_', ' ')}</p>
                    <p className="text-xs text-red-700 mt-1">Reported by {incident.created_by}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.active_signals && data.active_signals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                Active Intelligence Signals ({data.active_signals.length})
              </h3>
              <div className="bg-yellow-50 rounded-lg divide-y divide-yellow-100">
                {data.active_signals.map((signal, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-yellow-900">{signal.resident_name}</p>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        signal.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        signal.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {signal.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-800 font-medium">{signal.signal_type.replace('_', ' ')}</p>
                    <p className="text-sm text-yellow-700 mt-1">{signal.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Care Notes ({data?.care_notes?.length || 0})
            </h3>
            {data?.care_notes && data.care_notes.length > 0 ? (
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                {data.care_notes.map((note, idx) => (
                  <div key={idx} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-900">{note.resident_name}</p>
                      <p className="text-sm text-gray-600">{formatTime(note.created_at)}</p>
                    </div>
                    <p className="text-sm text-gray-700">{note.note}</p>
                    <p className="text-xs text-gray-500 mt-1">By {note.created_by}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">No care notes from this shift</p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Close Handoff Report
          </button>
        </div>
      </div>
    </div>
  );
}
