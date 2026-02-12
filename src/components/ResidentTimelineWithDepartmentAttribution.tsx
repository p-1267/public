import { useState, useEffect } from 'react';
import { TaskCompletion } from '../types/operationalModel';
import { useShowcase } from '../contexts/ShowcaseContext';

interface OperationalResident {
  id: string;
  name: string;
  [key: string]: any;
}

interface ResidentTimelineProps {
  residentId: string;
  operatingMode: 'AGENCY' | 'HYBRID' | 'FAMILY_HOME';
}

export function ResidentTimelineWithDepartmentAttribution({ residentId, operatingMode }: ResidentTimelineProps) {
  const { operationalData } = useShowcase();
  const [resident, setResident] = useState<OperationalResident | null>(null);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [housekeepingReports, setHousekeepingReports] = useState<any[]>([]);
  const [kitchenReports, setKitchenReports] = useState<any[]>([]);

  useEffect(() => {
    if (operationalData) {
      const foundResident = operationalData.residents.find((r: OperationalResident) => r.id === residentId);
      setResident(foundResident || null);
      setCompletions(operationalData.taskCompletions.filter((c: TaskCompletion) => c.resident_id === residentId));
      setHousekeepingReports(operationalData.housekeepingReports.filter((r: any) => r.resident_id === residentId));
      setKitchenReports(operationalData.kitchenReports.flatMap((kr: any) => kr.residents.filter((res: any) => res.resident_id === residentId).map((res: any) => ({ ...kr, residentData: res }))));
    }
  }, [operationalData, residentId, operatingMode]);

  if (!resident) {
    return <div className="p-6 text-center text-gray-600">Resident not found</div>;
  }

  const nursingEntries = completions.filter(c => c.completed_by_department === 'NURSING');
  const housekeepingEntries = housekeepingReports;
  const kitchenEntries = kitchenReports;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-blue-900 text-white rounded-lg p-6 border-4 border-blue-700">
        <div className="text-3xl font-bold mb-2">{resident.name}</div>
        <div className="text-lg opacity-90">Room {resident.room} | Age {resident.age} | Acuity: {resident.acuity}</div>
        <div className="text-sm opacity-75 mt-1">
          Conditions: {resident.conditions.join(', ')}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border-2 border-blue-600 p-4">
          <div className="text-sm font-bold text-blue-900 mb-1">NURSING</div>
          <div className="text-4xl font-bold text-blue-900">{nursingEntries.length}</div>
          <div className="text-xs text-gray-600 mt-1">Clinical activities</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-teal-600 p-4">
          <div className="text-sm font-bold text-teal-900 mb-1">HOUSEKEEPING</div>
          <div className="text-4xl font-bold text-teal-900">{housekeepingEntries.length}</div>
          <div className="text-xs text-gray-600 mt-1">Room services</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-orange-600 p-4">
          <div className="text-sm font-bold text-orange-900 mb-1">KITCHEN</div>
          <div className="text-4xl font-bold text-orange-900">{kitchenEntries.length}</div>
          <div className="text-xs text-gray-600 mt-1">Meals served</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-400 p-6">
        <div className="text-2xl font-bold text-gray-900 mb-4">ACTIVITY TIMELINE (DEPARTMENT ATTRIBUTION)</div>

        <div className="space-y-4">
          <div className="border-l-4 border-blue-600 pl-4">
            <div className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
              <span>🏥</span>
              <span>NURSING DEPARTMENT</span>
            </div>
            {nursingEntries.length === 0 ? (
              <div className="text-gray-600 italic">No nursing activities recorded</div>
            ) : (
              <div className="space-y-2">
                {nursingEntries.map(entry => (
                  <div key={entry.id} className="bg-blue-50 rounded-lg p-3 border border-blue-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="font-bold text-blue-900">{entry.task_name}</div>
                        <div className="text-sm text-blue-800 mt-1">
                          Category: {entry.task_category}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <div className="font-bold text-blue-900">Performed by:</div>
                            <div className="text-blue-800">{entry.completed_by_name}</div>
                            <div className="text-blue-700">{entry.completed_by_role} | {entry.completed_by_department}</div>
                            <div className="text-blue-700">Credentials: {entry.credential_status}</div>
                          </div>
                          <div>
                            <div className="font-bold text-blue-900">Timestamp:</div>
                            <div className="text-blue-800">{new Date(entry.completed_at).toLocaleString()}</div>
                            {entry.duration_minutes && (
                              <div className="text-blue-700">Duration: {entry.duration_minutes} min</div>
                            )}
                            {entry.evidence_type && (
                              <div className="text-blue-700">Evidence: {entry.evidence_type}</div>
                            )}
                          </div>
                        </div>
                        {entry.supervisor_acknowledgement && (
                          <div className="mt-2 bg-blue-100 rounded p-2 text-xs border border-blue-300">
                            <div className="font-bold text-blue-900">Supervisor Acknowledgement:</div>
                            <div className={`${
                              entry.supervisor_acknowledgement.status === 'ACKNOWLEDGED' ? 'text-green-700' :
                              entry.supervisor_acknowledgement.status === 'APPROVED' ? 'text-blue-700' :
                              'text-yellow-700'
                            } font-bold`}>
                              Status: {entry.supervisor_acknowledgement.status}
                            </div>
                            {entry.supervisor_acknowledgement.acknowledged_by_name && (
                              <div className="text-blue-700">
                                By: {entry.supervisor_acknowledgement.acknowledged_by_name} at {new Date(entry.supervisor_acknowledgement.acknowledged_at!).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-l-4 border-teal-600 pl-4">
            <div className="text-lg font-bold text-teal-900 mb-3 flex items-center gap-2">
              <span>🧹</span>
              <span>HOUSEKEEPING DEPARTMENT</span>
            </div>
            {housekeepingEntries.length === 0 ? (
              <div className="text-gray-600 italic">No housekeeping activities recorded</div>
            ) : (
              <div className="space-y-2">
                {housekeepingEntries.map(entry => (
                  <div key={entry.id} className="bg-teal-50 rounded-lg p-3 border border-teal-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="font-bold text-teal-900">Room {entry.room_number} Service</div>
                        <div className="text-sm text-teal-800 mt-1">
                          Status: {entry.status}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <div className="font-bold text-teal-900">Performed by:</div>
                            <div className="text-teal-800">{entry.reported_by_name}</div>
                            <div className="text-teal-700">HOUSEKEEPING</div>
                          </div>
                          <div>
                            <div className="font-bold text-teal-900">Timestamp:</div>
                            <div className="text-teal-800">{new Date(entry.reported_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="mt-2 bg-teal-100 rounded p-2 text-xs">
                          <div className="font-bold text-teal-900">Tasks Completed:</div>
                          <div className="text-teal-800">{entry.tasks_completed.join(', ')}</div>
                        </div>
                        {entry.supervisor_acknowledgement && (
                          <div className="mt-2 bg-teal-100 rounded p-2 text-xs border border-teal-300">
                            <div className="font-bold text-teal-900">Supervisor Acknowledgement:</div>
                            <div className={`${
                              entry.supervisor_acknowledgement.status === 'ACKNOWLEDGED' ? 'text-green-700' :
                              entry.supervisor_acknowledgement.status === 'APPROVED' ? 'text-blue-700' :
                              'text-yellow-700'
                            } font-bold`}>
                              Status: {entry.supervisor_acknowledgement.status}
                            </div>
                            {entry.supervisor_acknowledgement.acknowledged_by_name && (
                              <div className="text-teal-700">
                                By: {entry.supervisor_acknowledgement.acknowledged_by_name}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-l-4 border-orange-600 pl-4">
            <div className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
              <span>🍽️</span>
              <span>KITCHEN DEPARTMENT</span>
            </div>
            {kitchenEntries.length === 0 ? (
              <div className="text-gray-600 italic">No kitchen activities recorded</div>
            ) : (
              <div className="space-y-2">
                {kitchenEntries.map((entry, idx) => (
                  <div key={idx} className="bg-orange-50 rounded-lg p-3 border border-orange-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="font-bold text-orange-900">{entry.meal_type} - {entry.meal_time}</div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <div className="font-bold text-orange-900">Prepared by:</div>
                            <div className="text-orange-800">{entry.prepared_by_name}</div>
                            <div className="text-orange-700">KITCHEN</div>
                            <div className="text-orange-800 mt-1">Delivered by:</div>
                            <div className="text-orange-800">{entry.delivered_by_name}</div>
                          </div>
                          <div>
                            <div className="font-bold text-orange-900">Intake Logged by:</div>
                            <div className="text-orange-800">{entry.residentData.intake_logged_by_name}</div>
                            <div className="text-orange-700">
                              {new Date(entry.residentData.intake_logged_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 bg-orange-100 rounded p-2 text-xs">
                          <div className="font-bold text-orange-900">Intake: {entry.residentData.intake_percent}%</div>
                          {entry.residentData.calories && (
                            <div className="text-orange-800">
                              Calories: {entry.residentData.calories} | Protein: {entry.residentData.macros.protein}g
                            </div>
                          )}
                          {entry.residentData.concerns && (
                            <div className="text-red-700 font-bold mt-1">Concern: {entry.residentData.concerns}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
