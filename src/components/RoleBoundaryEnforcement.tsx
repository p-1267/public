interface RoleDefinition {
  role: string;
  licensure: string[];
  allowed_actions: string[];
  prohibited_actions: string[];
  supervision_required: string[];
  max_resident_ratio: number | null;
}

interface RoleViolation {
  id: string;
  caregiver_name: string;
  caregiver_role: string;
  attempted_action: string;
  required_role: string;
  violation_type: 'LICENSURE' | 'SCOPE' | 'RATIO' | 'SUPERVISION';
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  timestamp: string;
  was_blocked: boolean;
  system_judgment: string;
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: 'LICENSED_NURSE',
    licensure: ['RN', 'LPN'],
    allowed_actions: ['Administer injectable medications', 'IV therapy', 'Wound care (complex)', 'Assessment', 'Care planning'],
    prohibited_actions: ['Prescribe medications', 'Perform surgery', 'Diagnose conditions'],
    supervision_required: [],
    max_resident_ratio: 6
  },
  {
    role: 'CARE_AIDE',
    licensure: ['CNA', 'Home Health Aide'],
    allowed_actions: ['Oral medications (supervised)', 'Vital signs', 'ADL assistance', 'Mobility assistance', 'Basic wound care'],
    prohibited_actions: ['Injectable medications', 'IV therapy', 'Complex wound care', 'Assessment', 'Care plan modifications'],
    supervision_required: ['Oral medications', 'Complex mobility'],
    max_resident_ratio: 8
  },
  {
    role: 'HOUSEKEEPING',
    licensure: ['None required'],
    allowed_actions: ['Room cleaning', 'Laundry', 'Facility maintenance', 'Supply restocking'],
    prohibited_actions: ['Any clinical care', 'Medication handling', 'Direct resident care', 'Medical equipment'],
    supervision_required: ['All clinical areas'],
    max_resident_ratio: null
  },
  {
    role: 'AGENCY_FLOAT',
    licensure: ['Varies - must be verified'],
    allowed_actions: ['Actions matching verified credentials only'],
    prohibited_actions: ['Any action without credential verification'],
    supervision_required: ['First shift at facility', 'Unfamiliar procedures'],
    max_resident_ratio: null
  }
];

export function RoleBoundaryEnforcement({ violations }: { violations: RoleViolation[] }) {
  const activeViolations = violations.filter(v => !v.was_blocked);
  const blockedViolations = violations.filter(v => v.was_blocked);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">ROLE BOUNDARY ENFORCEMENT</h2>
          <div className="text-sm text-gray-600 mt-1">Qualification tracking and violation detection</div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{activeViolations.length}</div>
            <div className="text-xs text-gray-600">ACTIVE VIOLATIONS</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{blockedViolations.length}</div>
            <div className="text-xs text-gray-600">BLOCKED BY SYSTEM</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ROLE_DEFINITIONS.map((role) => (
          <div key={role.role} className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <div className="text-lg font-bold mb-3">{role.role.replace(/_/g, ' ')}</div>

            <div className="mb-3">
              <div className="text-xs font-bold text-gray-600 mb-1">LICENSURE REQUIRED</div>
              <div className="text-sm text-gray-800">{role.licensure.join(', ')}</div>
            </div>

            {role.max_resident_ratio && (
              <div className="mb-3">
                <div className="text-xs font-bold text-gray-600 mb-1">MAX RESIDENT RATIO</div>
                <div className="text-sm text-gray-800">1:{role.max_resident_ratio}</div>
              </div>
            )}

            <div className="mb-3">
              <div className="text-xs font-bold text-green-600 mb-1">✓ ALLOWED ACTIONS</div>
              <ul className="text-xs text-green-800 space-y-1">
                {role.allowed_actions.slice(0, 3).map((action, idx) => (
                  <li key={idx}>• {action}</li>
                ))}
              </ul>
            </div>

            <div className="mb-3">
              <div className="text-xs font-bold text-red-600 mb-1">✗ PROHIBITED ACTIONS</div>
              <ul className="text-xs text-red-800 space-y-1">
                {role.prohibited_actions.slice(0, 3).map((action, idx) => (
                  <li key={idx}>• {action}</li>
                ))}
              </ul>
            </div>

            {role.supervision_required.length > 0 && (
              <div>
                <div className="text-xs font-bold text-yellow-600 mb-1">⚠ REQUIRES SUPERVISION</div>
                <ul className="text-xs text-yellow-800 space-y-1">
                  {role.supervision_required.map((action, idx) => (
                    <li key={idx}>• {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {activeViolations.length > 0 && (
        <div className="space-y-4">
          <div className="text-xl font-bold text-red-900">🚨 ACTIVE VIOLATIONS (UNACCEPTABLE)</div>
          {activeViolations.map((violation) => (
            <div key={violation.id} className="bg-red-50 border-4 border-red-600 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-lg font-bold text-red-900 mb-1">{violation.caregiver_name}</div>
                  <div className="text-sm text-red-700">{violation.caregiver_role} attempting {violation.attempted_action}</div>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-red-900 text-white rounded-full text-sm font-bold mb-1">
                    {violation.risk_level}
                  </div>
                  <div className="text-xs text-red-600">{new Date(violation.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-white border-2 border-red-600 rounded p-4 mb-3">
                <div className="text-sm font-bold text-red-900 mb-2">SYSTEM JUDGMENT</div>
                <div className="text-base text-red-800 font-semibold">{violation.system_judgment}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-bold text-red-700 mb-1">VIOLATION TYPE</div>
                  <div className="text-sm text-red-900">{violation.violation_type}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-red-700 mb-1">REQUIRED ROLE</div>
                  <div className="text-sm text-red-900">{violation.required_role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {blockedViolations.length > 0 && (
        <div className="space-y-4">
          <div className="text-xl font-bold text-green-900">✓ VIOLATIONS BLOCKED BY SYSTEM</div>
          {blockedViolations.map((violation) => (
            <div key={violation.id} className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-green-900">{violation.caregiver_name}</div>
                  <div className="text-xs text-green-700">Attempted: {violation.attempted_action}</div>
                </div>
                <div className="text-right">
                  <div className="px-2 py-1 bg-green-600 text-white rounded text-xs font-bold">BLOCKED</div>
                  <div className="text-xs text-green-600 mt-1">{new Date(violation.timestamp).toLocaleString()}</div>
                </div>
              </div>
              <div className="text-xs text-green-700 mt-2">Required: {violation.required_role}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
