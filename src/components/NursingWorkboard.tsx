import { useState, useEffect } from 'react';
import { OperationalDataGenerator, OperationalResident } from '../services/operationalDataGenerator';
import { StaffMember, TaskCompletion, OPERATING_MODE_CONFIGS } from '../types/operationalModel';

interface NursingWorkboardProps {
  operatingMode: 'AGENCY' | 'HYBRID' | 'FAMILY_HOME';
}

export function NursingWorkboard({ operatingMode }: NursingWorkboardProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [residents, setResidents] = useState<OperationalResident[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);

  useEffect(() => {
    const generatedStaff = OperationalDataGenerator.generateStaff(operatingMode);
    const generatedResidents = OperationalDataGenerator.generateResidents(operatingMode);
    const generatedCompletions = OperationalDataGenerator.generateTaskCompletions(generatedResidents, generatedStaff);

    setStaff(generatedStaff.filter(s => s.department === 'NURSING'));
    setResidents(generatedResidents);
    setCompletions(generatedCompletions.filter(c => c.completed_by_department === 'NURSING'));
  }, [operatingMode]);

  const nursingCompletions = completions.filter(c => c.completed_by_department === 'NURSING');
  const pendingAcknowledgement = nursingCompletions.filter(c => c.supervisor_acknowledgement?.status === 'PENDING');
  const acknowledged = nursingCompletions.filter(c => c.supervisor_acknowledgement?.status === 'ACKNOWLEDGED');

  const config = OPERATING_MODE_CONFIGS[operatingMode];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-blue-900 text-white rounded-lg p-6 border-4 border-blue-700">
        <div className="text-3xl font-bold mb-2">NURSING WORKBOARD</div>
        <div className="text-lg opacity-90">Department: NURSING | Mode: {operatingMode}</div>
        <div className="text-sm opacity-75 mt-1">{config.description}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">NURSING STAFF</div>
          <div className="text-4xl font-bold text-blue-900">{staff.length}</div>
          <div className="text-xs text-gray-600 mt-1">RN, LPN, CNA, Med Aide</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">TASKS COMPLETED</div>
          <div className="text-4xl font-bold text-green-900">{nursingCompletions.length}</div>
          <div className="text-xs text-gray-600 mt-1">All clinical activities</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-yellow-500 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">PENDING REVIEW</div>
          <div className="text-4xl font-bold text-yellow-900">{pendingAcknowledgement.length}</div>
          <div className="text-xs text-gray-600 mt-1">Awaiting supervisor acknowledgement</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">ACKNOWLEDGED</div>
          <div className="text-4xl font-bold text-gray-700">{acknowledged.length}</div>
          <div className="text-xs text-gray-600 mt-1">Supervisor reviewed</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-blue-700 p-6">
        <div className="text-xl font-bold text-blue-900 mb-4">NURSING STAFF ON DUTY</div>
        <div className="space-y-3">
          {staff.map(member => (
            <div key={member.id} className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-900 text-lg">{member.name}</div>
                  <div className="text-sm text-blue-700">
                    {member.role} | Shift: {member.shift} | Credentials: {member.credentials_verified ? '✓ VERIFIED' : '✗ UNVERIFIED'}
                  </div>
                  {member.license_number && (
                    <div className="text-xs text-blue-600 mt-1">License: {member.license_number}</div>
                  )}
                  {member.supervisor_id && (
                    <div className="text-xs text-blue-600">Supervisor: {staff.find(s => s.id === member.supervisor_id)?.name || 'Unknown'}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">{member.current_assigned_count}</div>
                  <div className="text-xs text-blue-700">
                    {member.max_resident_ratio ? `/ ${member.max_resident_ratio} max` : 'residents'}
                  </div>
                  {member.max_resident_ratio && member.current_assigned_count > member.max_resident_ratio && (
                    <div className="text-xs font-bold text-red-600 mt-1">RATIO VIOLATION</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-yellow-600 p-6">
        <div className="text-xl font-bold text-yellow-900 mb-4">PENDING SUPERVISOR ACKNOWLEDGEMENT ({pendingAcknowledgement.length})</div>
        {pendingAcknowledgement.length === 0 ? (
          <div className="text-center text-gray-600 py-8">All nursing tasks have been acknowledged by supervisor</div>
        ) : (
          <div className="space-y-3">
            {pendingAcknowledgement.slice(0, 10).map(completion => (
              <div key={completion.id} className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-400">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="font-bold text-yellow-900">{completion.task_name}</div>
                    <div className="text-sm text-yellow-800 mt-1">
                      Resident: {completion.resident_name} (Room {completion.resident_room})
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <div className="font-bold text-yellow-900">Performed by:</div>
                        <div className="text-yellow-800">{completion.completed_by_name}</div>
                        <div className="text-yellow-700">{completion.completed_by_role} | {completion.completed_by_department}</div>
                        <div className="text-yellow-700">Credentials: {completion.credential_status}</div>
                      </div>
                      <div>
                        <div className="font-bold text-yellow-900">Completed at:</div>
                        <div className="text-yellow-800">{new Date(completion.completed_at).toLocaleString()}</div>
                        {completion.duration_minutes && (
                          <div className="text-yellow-700">Duration: {completion.duration_minutes} minutes</div>
                        )}
                        {completion.evidence_type && (
                          <div className="text-yellow-700">Evidence: {completion.evidence_type}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700">
                      ACKNOWLEDGE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border-2 border-green-700 p-6">
        <div className="text-xl font-bold text-green-900 mb-4">RECENT COMPLETIONS ({nursingCompletions.length})</div>
        <div className="space-y-2">
          {nursingCompletions.slice(0, 15).map(completion => (
            <div key={completion.id} className="bg-green-50 rounded-lg p-3 border border-green-300 flex items-center justify-between">
              <div className="flex-grow">
                <div className="font-bold text-green-900">{completion.task_name}</div>
                <div className="text-sm text-green-800">
                  {completion.resident_name} (Room {completion.resident_room}) | by {completion.completed_by_name} ({completion.completed_by_role})
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="text-green-700">{new Date(completion.completed_at).toLocaleTimeString()}</div>
                <div className={`font-bold ${
                  completion.supervisor_acknowledgement?.status === 'ACKNOWLEDGED' ? 'text-green-600' :
                  completion.supervisor_acknowledgement?.status === 'APPROVED' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {completion.supervisor_acknowledgement?.status || 'PENDING'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
