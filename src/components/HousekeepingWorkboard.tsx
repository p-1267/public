import { useState, useEffect } from 'react';
import { StaffMember, HousekeepingReport, OPERATING_MODE_CONFIGS } from '../types/operationalModel';

interface OperationalResident {
  id: string;
  name: string;
  [key: string]: any;
}

interface HousekeepingWorkboardProps {
  operatingMode: 'AGENCY' | 'HYBRID' | 'FAMILY_HOME';
}

export function HousekeepingWorkboard({ operatingMode }: HousekeepingWorkboardProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [residents, setResidents] = useState<OperationalResident[]>([]);
  const [reports, setReports] = useState<HousekeepingReport[]>([]);

  useEffect(() => {
    setStaff([]);
    setResidents([]);
    setReports([]);
  }, [operatingMode]);

  const completed = reports.filter(r => r.status === 'COMPLETED');
  const inProgress = reports.filter(r => r.status === 'IN_PROGRESS');
  const blocked = reports.filter(r => r.status === 'BLOCKED');
  const pendingAcknowledgement = reports.filter(r => r.supervisor_acknowledgement.status === 'PENDING');

  const config = OPERATING_MODE_CONFIGS[operatingMode];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-900 to-green-900 text-white rounded-lg p-6 border-4 border-teal-700">
        <div className="text-3xl font-bold mb-2">HOUSEKEEPING WORKBOARD</div>
        <div className="text-lg opacity-90">Department: HOUSEKEEPING | Mode: {operatingMode}</div>
        <div className="text-sm opacity-75 mt-1">{config.description}</div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">STAFF</div>
          <div className="text-4xl font-bold text-teal-900">{staff.length}</div>
          <div className="text-xs text-gray-600 mt-1">Housekeepers + Supervisors</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-green-500 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">COMPLETED</div>
          <div className="text-4xl font-bold text-green-900">{completed.length}</div>
          <div className="text-xs text-gray-600 mt-1">Rooms finished</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-blue-500 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">IN PROGRESS</div>
          <div className="text-4xl font-bold text-blue-900">{inProgress.length}</div>
          <div className="text-xs text-gray-600 mt-1">Currently cleaning</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-red-500 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">BLOCKED</div>
          <div className="text-4xl font-bold text-red-900">{blocked.length}</div>
          <div className="text-xs text-gray-600 mt-1">Issues/maintenance</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-yellow-500 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">PENDING REVIEW</div>
          <div className="text-4xl font-bold text-yellow-900">{pendingAcknowledgement.length}</div>
          <div className="text-xs text-gray-600 mt-1">Awaiting acknowledgement</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-teal-700 p-6">
        <div className="text-xl font-bold text-teal-900 mb-4">HOUSEKEEPING STAFF ON DUTY</div>
        <div className="space-y-3">
          {staff.map(member => (
            <div key={member.id} className="bg-teal-50 rounded-lg p-4 border-2 border-teal-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-teal-900 text-lg">{member.name}</div>
                  <div className="text-sm text-teal-700">
                    {member.role} | Shift: {member.shift} | {member.can_supervise ? 'SUPERVISOR' : 'Staff'}
                  </div>
                  {member.secondary_roles && member.secondary_roles.length > 0 && (
                    <div className="text-xs text-teal-600 mt-1">
                      Secondary roles: {member.secondary_roles.join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-xs text-teal-700">
                  {member.credentials_verified ? '✓ VERIFIED' : '✗ UNVERIFIED'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {blocked.length > 0 && (
        <div className="bg-red-100 rounded-lg border-4 border-red-600 p-6">
          <div className="text-xl font-bold text-red-900 mb-4">🚨 BLOCKED ROOMS ({blocked.length}) - REQUIRES IMMEDIATE ATTENTION</div>
          <div className="space-y-3">
            {blocked.map(report => (
              <div key={report.id} className="bg-white rounded-lg p-4 border-2 border-red-400">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-red-900 text-lg">Room {report.room_number}</div>
                    <div className="text-sm text-red-800">Reported by: {report.reported_by_name}</div>
                    <div className="text-xs text-red-700">{new Date(report.reported_at).toLocaleString()}</div>
                  </div>
                  <div className="bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-sm">
                    BLOCKED
                  </div>
                </div>
                <div className="bg-red-50 rounded p-3 mb-3">
                  <div className="font-bold text-red-900 mb-2">ISSUES FOUND:</div>
                  <ul className="space-y-1">
                    {report.issues_found.map((issue, idx) => (
                      <li key={idx} className="text-red-800 text-sm">• {issue}</li>
                    ))}
                  </ul>
                </div>
                {report.maintenance_required && (
                  <div className="bg-orange-100 rounded p-3 border-2 border-orange-500">
                    <div className="font-bold text-orange-900 mb-1">MAINTENANCE REQUIRED</div>
                    <div className="text-sm text-orange-800">{report.maintenance_notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingAcknowledgement.length > 0 && (
        <div className="bg-yellow-100 rounded-lg border-4 border-yellow-600 p-6">
          <div className="text-xl font-bold text-yellow-900 mb-4">PENDING SUPERVISOR ACKNOWLEDGEMENT ({pendingAcknowledgement.length})</div>
          <div className="space-y-3">
            {pendingAcknowledgement.map(report => (
              <div key={report.id} className="bg-white rounded-lg p-4 border-2 border-yellow-400">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-grow">
                    <div className="font-bold text-yellow-900 text-lg">Room {report.room_number}</div>
                    <div className="text-sm text-yellow-800 mb-2">
                      Reported by: {report.reported_by_name} at {new Date(report.reported_at).toLocaleString()}
                    </div>
                    {report.voice_transcript && (
                      <div className="bg-blue-50 rounded p-3 mb-2 border border-blue-300">
                        <div className="text-xs font-bold text-blue-900 mb-1">
                          VOICE REPORT ({report.voice_language?.toUpperCase()}) | Confidence: {((report.translation_confidence || 0) * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-blue-800 italic">"{report.voice_transcript}"</div>
                        {report.voice_language === 'es' && (
                          <div className="text-xs text-blue-700 mt-2">
                            Translation: "Room {report.room_number} cleaned, linens changed, everything ready."
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-green-50 rounded p-3 mb-2">
                      <div className="font-bold text-green-900 mb-1 text-sm">TASKS COMPLETED:</div>
                      <div className="text-sm text-green-800">
                        {report.tasks_completed.join(', ')}
                      </div>
                    </div>
                    {report.issues_found.length > 0 && (
                      <div className="bg-orange-50 rounded p-3 border border-orange-300">
                        <div className="font-bold text-orange-900 mb-1 text-sm">ISSUES:</div>
                        <ul className="space-y-1">
                          {report.issues_found.map((issue, idx) => (
                            <li key={idx} className="text-orange-800 text-sm">• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 mb-2">
                      ACKNOWLEDGE
                    </button>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 block">
                      VOICE RESPONSE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border-2 border-green-700 p-6">
        <div className="text-xl font-bold text-green-900 mb-4">RECENT COMPLETIONS ({completed.length})</div>
        <div className="space-y-2">
          {completed.map(report => (
            <div key={report.id} className="bg-green-50 rounded-lg p-3 border border-green-300 flex items-center justify-between">
              <div className="flex-grow">
                <div className="font-bold text-green-900">Room {report.room_number}</div>
                <div className="text-sm text-green-800">
                  by {report.reported_by_name} | {report.tasks_completed.length} tasks | {new Date(report.reported_at).toLocaleTimeString()}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className={`font-bold ${
                  report.supervisor_acknowledgement.status === 'ACKNOWLEDGED' ? 'text-green-600' :
                  report.supervisor_acknowledgement.status === 'APPROVED' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {report.supervisor_acknowledgement.status}
                </div>
                {report.supervisor_acknowledgement.acknowledged_by_name && (
                  <div className="text-gray-600">by {report.supervisor_acknowledgement.acknowledged_by_name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
