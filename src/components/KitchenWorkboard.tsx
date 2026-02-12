import { useState, useEffect } from 'react';
import { StaffMember, KitchenReport, OPERATING_MODE_CONFIGS } from '../types/operationalModel';
import { useShowcase } from '../contexts/ShowcaseContext';

interface OperationalResident {
  id: string;
  name: string;
  [key: string]: any;
}

interface KitchenWorkboardProps {
  operatingMode: 'AGENCY' | 'HYBRID' | 'FAMILY_HOME';
}

export function KitchenWorkboard({ operatingMode }: KitchenWorkboardProps) {
  const { operationalData } = useShowcase();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [residents, setResidents] = useState<OperationalResident[]>([]);
  const [reports, setReports] = useState<KitchenReport[]>([]);

  useEffect(() => {
    if (operationalData) {
      setStaff(operationalData.staff.filter((s: StaffMember) => s.department === 'KITCHEN'));
      setResidents(operationalData.residents);
      setReports(operationalData.kitchenReports);
    }
  }, [operationalData, operatingMode]);

  const totalMealsServed = reports.reduce((sum, r) => sum + r.residents.length, 0);
  const avgIntake = reports.length > 0
    ? reports.reduce((sum, r) => sum + r.residents.reduce((s, res) => s + (res.intake_percent || 0), 0), 0) / totalMealsServed
    : 0;
  const concernResidents = reports.flatMap(r => r.residents.filter(res => res.concerns));

  const config = OPERATING_MODE_CONFIGS[operatingMode];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-900 to-amber-900 text-white rounded-lg p-6 border-4 border-orange-700">
        <div className="text-3xl font-bold mb-2">KITCHEN / NUTRITION WORKBOARD</div>
        <div className="text-lg opacity-90">Department: KITCHEN | Mode: {operatingMode}</div>
        <div className="text-sm opacity-75 mt-1">{config.description}</div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">KITCHEN STAFF</div>
          <div className="text-4xl font-bold text-orange-900">{staff.length}</div>
          <div className="text-xs text-gray-600 mt-1">Cooks, dietary aides, delivery</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">MEALS SERVED</div>
          <div className="text-4xl font-bold text-green-900">{totalMealsServed}</div>
          <div className="text-xs text-gray-600 mt-1">Total servings tracked</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-gray-300 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">AVG INTAKE</div>
          <div className="text-4xl font-bold text-blue-900">{avgIntake.toFixed(0)}%</div>
          <div className="text-xs text-gray-600 mt-1">Average food consumption</div>
        </div>

        <div className="bg-white rounded-lg border-2 border-red-500 p-4">
          <div className="text-sm font-bold text-gray-600 mb-1">CONCERNS</div>
          <div className="text-4xl font-bold text-red-900">{concernResidents.length}</div>
          <div className="text-xs text-gray-600 mt-1">Residents with intake issues</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-orange-700 p-6">
        <div className="text-xl font-bold text-orange-900 mb-4">KITCHEN STAFF ON DUTY</div>
        <div className="space-y-3">
          {staff.map(member => (
            <div key={member.id} className="bg-orange-50 rounded-lg p-4 border-2 border-orange-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-orange-900 text-lg">{member.name}</div>
                  <div className="text-sm text-orange-700">
                    {member.role} | Shift: {member.shift} | {member.can_supervise ? 'SUPERVISOR' : 'Staff'}
                  </div>
                  {member.secondary_roles && member.secondary_roles.length > 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      Secondary roles: {member.secondary_roles.join(', ')}
                    </div>
                  )}
                </div>
                <div className="text-xs text-orange-700">
                  {member.credentials_verified ? '✓ VERIFIED' : '✗ UNVERIFIED'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {concernResidents.length > 0 && (
        <div className="bg-red-100 rounded-lg border-4 border-red-600 p-6">
          <div className="text-xl font-bold text-red-900 mb-4">🚨 RESIDENTS WITH INTAKE CONCERNS ({concernResidents.length})</div>
          <div className="space-y-3">
            {concernResidents.map((resident, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border-2 border-red-400">
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="font-bold text-red-900 text-lg">{resident.resident_name} (Room {resident.room_number})</div>
                    <div className="text-sm text-red-800 mb-2">Intake: {resident.intake_percent}%</div>
                    <div className="bg-red-50 rounded p-3">
                      <div className="font-bold text-red-900 mb-1 text-sm">CONCERN:</div>
                      <div className="text-red-800">{resident.concerns}</div>
                    </div>
                    {resident.intake_logged_by_name && (
                      <div className="text-xs text-red-700 mt-2">
                        Logged by: {resident.intake_logged_by_name} at {new Date(resident.intake_logged_at!).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border-2 border-green-700 p-6">
        <div className="text-xl font-bold text-green-900 mb-4">MEAL REPORTS ({reports.length})</div>
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-green-50 rounded-lg p-4 border-2 border-green-300">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-green-900 text-lg">{report.meal_type} - {report.meal_time}</div>
                  <div className="text-sm text-green-800">
                    Prepared by: {report.prepared_by_name} | Delivered by: {report.delivered_by_name}
                  </div>
                  <div className="text-xs text-green-700">
                    Prepared: {new Date(report.prepared_at).toLocaleTimeString()} | Delivered: {new Date(report.delivered_at!).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-900">{report.residents.length}</div>
                  <div className="text-xs text-green-700">servings</div>
                </div>
              </div>

              <div className="bg-white rounded p-3 border border-green-300">
                <div className="text-sm font-bold text-green-900 mb-2">RESIDENT INTAKE TRACKING:</div>
                <div className="space-y-2">
                  {report.residents.map((resident, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 rounded ${
                      resident.concerns ? 'bg-red-50 border border-red-300' :
                      (resident.intake_percent || 0) < 60 ? 'bg-yellow-50 border border-yellow-300' :
                      'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex-grow">
                        <div className="font-bold text-sm">
                          {resident.resident_name} (Room {resident.room_number})
                        </div>
                        <div className="text-xs text-gray-700">
                          {resident.special_diet && <span className="mr-2">Diet: {resident.special_diet}</span>}
                          {resident.allergies && resident.allergies.length > 0 && (
                            <span className="text-red-600 font-bold">Allergies: {resident.allergies.join(', ')}</span>
                          )}
                        </div>
                        {resident.meal_plan && resident.calories && resident.macros && (
                          <div className="text-xs text-gray-600 mt-1">
                            Calories: {resident.calories} | Protein: {resident.macros.protein}g | Carbs: {resident.macros.carbs}g | Fat: {resident.macros.fat}g
                          </div>
                        )}
                        {(!resident.meal_plan || !resident.calories) && (
                          <div className="text-xs text-gray-500 italic mt-1">
                            Meal plan/macros: not available for this resident
                          </div>
                        )}
                        {resident.intake_logged_by_name && (
                          <div className="text-xs text-gray-600 mt-1">
                            Logged by: {resident.intake_logged_by_name} ({new Date(resident.intake_logged_at!).toLocaleTimeString()})
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${
                          resident.concerns ? 'text-red-900' :
                          (resident.intake_percent || 0) < 60 ? 'text-yellow-900' :
                          'text-green-900'
                        }`}>
                          {resident.intake_percent}%
                        </div>
                        <div className="text-xs text-gray-600">intake</div>
                        {resident.concerns && (
                          <div className="text-xs text-red-600 font-bold mt-1">{resident.concerns}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
