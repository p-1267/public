interface ResidentRisk {
  resident_id: string;
  resident_name: string;
  room: string;
  current_state: 'CRITICAL' | 'UNSAFE' | 'CONCERNING' | 'STABLE' | 'ACCEPTABLE';
  system_judgment: string;
  what_is_wrong: string[];
  what_is_at_risk: string[];
  trend: 'WORSENING' | 'STABLE' | 'IMPROVING';
  days_in_current_state: number;
  next_action_required: string;
  action_deadline: string;
  consequences_if_not_addressed: string[];
  assigned_caregiver: string;
  last_assessment: string;
}

export function ResidentRiskJudgment({ residents }: { residents: ResidentRisk[] }) {
  const critical = residents.filter(r => r.current_state === 'CRITICAL');
  const unsafe = residents.filter(r => r.current_state === 'UNSAFE');
  const concerning = residents.filter(r => r.current_state === 'CONCERNING');
  const stable = residents.filter(r => r.current_state === 'STABLE' || r.current_state === 'ACCEPTABLE');

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CRITICAL': return 'bg-red-900 text-white border-red-900';
      case 'UNSAFE': return 'bg-red-600 text-white border-red-600';
      case 'CONCERNING': return 'bg-yellow-600 text-white border-yellow-600';
      case 'STABLE': return 'bg-green-600 text-white border-green-600';
      case 'ACCEPTABLE': return 'bg-green-600 text-white border-green-600';
      default: return 'bg-gray-600 text-white border-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'WORSENING': return '📉 WORSENING';
      case 'STABLE': return '➡️ STABLE';
      case 'IMPROVING': return '📈 IMPROVING';
      default: return '—';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">RESIDENT RISK JUDGMENT</h2>
          <div className="text-sm text-gray-600 mt-1">System analysis of current resident states</div>
        </div>
        <div className="flex gap-4">
          {critical.length > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-red-900">{critical.length}</div>
              <div className="text-xs text-gray-600">CRITICAL</div>
            </div>
          )}
          {unsafe.length > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{unsafe.length}</div>
              <div className="text-xs text-gray-600">UNSAFE</div>
            </div>
          )}
          {concerning.length > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{concerning.length}</div>
              <div className="text-xs text-gray-600">CONCERNING</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stable.length}</div>
            <div className="text-xs text-gray-600">ACCEPTABLE</div>
          </div>
        </div>
      </div>

      {critical.length === 0 && unsafe.length === 0 && concerning.length === 0 && (
        <div className="bg-green-50 border-2 border-green-600 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <div className="text-2xl font-bold text-green-900 mb-2">ALL RESIDENTS: ACCEPTABLE STATE</div>
          <div className="text-lg text-green-800">No critical, unsafe, or concerning conditions detected.</div>
        </div>
      )}

      {critical.map((resident) => (
        <div key={resident.resident_id} className="border-4 border-red-900 rounded-lg overflow-hidden">
          <div className="bg-red-900 text-white p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-bold mb-1">🚨 CRITICAL: {resident.resident_name}</div>
                <div className="text-sm">Room {resident.room} • {getTrendIcon(resident.trend)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs mb-1">IN STATE FOR</div>
                <div className="text-2xl font-bold">{resident.days_in_current_state} DAYS</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 space-y-4">
            <div className="bg-red-50 border-2 border-red-600 rounded-lg p-4">
              <div className="text-sm font-bold text-red-900 mb-2">SYSTEM JUDGMENT</div>
              <div className="text-lg text-red-800 font-semibold">{resident.system_judgment}</div>
            </div>

            <div className="border-l-4 border-red-600 pl-4">
              <div className="text-xs font-bold text-red-600 mb-2">WHAT IS WRONG</div>
              <ul className="space-y-1">
                {resident.what_is_wrong.map((issue, idx) => (
                  <li key={idx} className="text-sm text-red-900 font-semibold">• {issue}</li>
                ))}
              </ul>
            </div>

            <div className="border-l-4 border-orange-600 pl-4">
              <div className="text-xs font-bold text-orange-600 mb-2">WHAT IS AT RISK</div>
              <ul className="space-y-1">
                {resident.what_is_at_risk.map((risk, idx) => (
                  <li key={idx} className="text-sm text-orange-900 font-semibold">• {risk}</li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
              <div className="text-sm font-bold text-green-900 mb-2">REQUIRED ACTION</div>
              <div className="text-base font-semibold text-green-800 mb-2">{resident.next_action_required}</div>
              <div className="text-sm text-green-700">
                <span className="font-bold">DEADLINE:</span> {new Date(resident.action_deadline).toLocaleString()}
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-600 rounded-lg p-4">
              <div className="text-sm font-bold text-red-900 mb-2">CONSEQUENCES IF NOT ADDRESSED</div>
              <ul className="space-y-1">
                {resident.consequences_if_not_addressed.map((consequence, idx) => (
                  <li key={idx} className="text-sm text-red-800 font-semibold">• {consequence}</li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-600">ASSIGNED CAREGIVER</div>
                <div className="font-semibold">{resident.assigned_caregiver}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">LAST ASSESSMENT</div>
                <div className="font-semibold">{new Date(resident.last_assessment).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {unsafe.map((resident) => (
        <div key={resident.resident_id} className="border-4 border-red-600 rounded-lg overflow-hidden">
          <div className="bg-red-600 text-white p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold mb-1">⚠️ UNSAFE: {resident.resident_name}</div>
                <div className="text-sm">Room {resident.room} • {getTrendIcon(resident.trend)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs mb-1">IN STATE FOR</div>
                <div className="text-xl font-bold">{resident.days_in_current_state} DAYS</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 space-y-3">
            <div className="bg-red-50 border border-red-600 rounded p-3">
              <div className="text-xs font-bold text-red-900 mb-1">SYSTEM JUDGMENT</div>
              <div className="text-sm text-red-800 font-semibold">{resident.system_judgment}</div>
            </div>

            <div className="text-sm">
              <div className="text-xs font-bold text-red-600 mb-1">WHAT IS WRONG</div>
              <ul className="space-y-1">
                {resident.what_is_wrong.map((issue, idx) => (
                  <li key={idx} className="text-red-900">• {issue}</li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 border border-green-600 rounded p-3">
              <div className="text-xs font-bold text-green-900 mb-1">REQUIRED ACTION</div>
              <div className="text-sm font-semibold text-green-800">{resident.next_action_required}</div>
            </div>
          </div>
        </div>
      ))}

      {concerning.map((resident) => (
        <div key={resident.resident_id} className="border-2 border-yellow-600 rounded-lg overflow-hidden">
          <div className="bg-yellow-600 text-white p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg font-bold">⚠ CONCERNING: {resident.resident_name}</div>
                <div className="text-sm">Room {resident.room} • {getTrendIcon(resident.trend)}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4">
            <div className="text-sm text-yellow-900 font-semibold mb-2">{resident.system_judgment}</div>
            <div className="text-xs text-yellow-800">{resident.next_action_required}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
