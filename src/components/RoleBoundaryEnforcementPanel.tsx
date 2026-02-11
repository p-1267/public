interface RoleBoundaryEnforcementPanelProps {
  caregiver: {
    name: string;
    role: string;
    can_give_injectable_meds: boolean;
    can_give_oral_meds: boolean;
    can_perform_wound_care: boolean;
    can_perform_clinical_assessment: boolean;
    violations: any[];
  };
  task?: {
    name: string;
    requires_license: boolean;
    category: string;
  };
}

export function RoleBoundaryEnforcementPanel({ caregiver, task }: RoleBoundaryEnforcementPanelProps) {
  const getRoleCapabilities = (role: string) => {
    switch (role) {
      case 'RN':
        return {
          allowed: [
            'Injectable medications (IV, IM, SubQ)',
            'Oral medications',
            'Complex wound care (Stage 3-4 ulcers)',
            'Clinical assessments',
            'Care plan development',
            'IV therapy management',
            'Tracheostomy care',
            'Delegation to LPN/CNA'
          ],
          forbidden: [
            'Actions outside scope of practice',
            'Prescribing medications',
            'Diagnosing medical conditions'
          ],
          max_ratio: 6
        };
      case 'LPN':
        return {
          allowed: [
            'Injectable medications (under RN delegation)',
            'Oral medications',
            'Basic wound care (Stage 1-2)',
            'Vital signs monitoring',
            'Data collection for assessments',
            'Medication administration',
            'Basic clinical procedures'
          ],
          forbidden: [
            'IV push medications',
            'Clinical assessments (RN required)',
            'Care plan development (RN required)',
            'Complex wound care (Stage 3-4)',
            'Delegating to other LPNs'
          ],
          max_ratio: 6
        };
      case 'CNA':
        return {
          allowed: [
            'Oral medications (supervised)',
            'Vital signs (basic)',
            'ADL assistance (bathing, dressing, toileting)',
            'Mobility assistance',
            'Feeding assistance',
            'Documentation of observations',
            'Basic hygiene care'
          ],
          forbidden: [
            'Injectable medications',
            'Wound care (any stage)',
            'Clinical assessments',
            'Medication administration (unsupervised)',
            'IV therapy',
            'Tracheostomy care',
            'Tube feeding',
            'Any clinical judgment or decision-making'
          ],
          max_ratio: 8
        };
      case 'HOUSEKEEPING':
        return {
          allowed: [
            'Room cleaning',
            'Laundry',
            'Environmental maintenance',
            'Supply restocking'
          ],
          forbidden: [
            'ANY clinical care',
            'ANY medication administration',
            'ANY resident assessment',
            'ANY direct resident care',
            'Documentation in clinical records'
          ],
          max_ratio: 0
        };
      default:
        return { allowed: [], forbidden: ['ALL CLINICAL ACTIONS'], max_ratio: 0 };
    }
  };

  const capabilities = getRoleCapabilities(caregiver.role);

  let taskBlocked = false;
  let blockReason = '';

  if (task) {
    if (task.requires_license && !caregiver.can_give_injectable_meds && task.category === 'Medication') {
      taskBlocked = true;
      blockReason = 'Task requires RN/LPN license for injectable medications. CNA cannot perform this task.';
    } else if (task.category === 'Wound Care' && !caregiver.can_perform_wound_care) {
      taskBlocked = true;
      blockReason = 'Complex wound care requires RN/LPN license. CNA cannot perform this task.';
    } else if (task.category === 'Assessment' && !caregiver.can_perform_clinical_assessment) {
      taskBlocked = true;
      blockReason = 'Clinical assessments require RN license. LPN/CNA cannot perform this task.';
    }
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-300">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4">
        <div className="text-xl font-bold mb-1">ROLE BOUNDARIES: {caregiver.role}</div>
        <div className="text-sm opacity-90">{caregiver.name}</div>
      </div>

      {taskBlocked && (
        <div className="bg-red-100 border-4 border-red-600 p-4 m-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🚫</div>
            <div>
              <div className="text-xl font-bold text-red-900 mb-2">ACTION BLOCKED: UNACCEPTABLE</div>
              <div className="text-sm text-red-800 font-bold mb-2">Task: {task?.name}</div>
              <div className="text-sm text-red-800 mb-3">{blockReason}</div>
              <div className="bg-red-200 rounded p-3 text-sm text-red-900">
                <div className="font-bold mb-1">CONSEQUENCES IF BYPASSED:</div>
                <ul className="space-y-1">
                  <li>• Patient safety compromised</li>
                  <li>• Regulatory violation (state board citation)</li>
                  <li>• Facility liability exposure</li>
                  <li>• Caregiver license at risk</li>
                  <li>• Immediate corrective action required</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {caregiver.violations.length > 0 && (
        <div className="bg-orange-100 border-2 border-orange-600 p-4 m-4 rounded-lg">
          <div className="font-bold text-orange-900 mb-2">ACTIVE VIOLATIONS ON RECORD:</div>
          {caregiver.violations.map((v: any, idx: number) => (
            <div key={idx} className="bg-white rounded p-2 mb-2 last:mb-0">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-orange-900">{v.type}</div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  v.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                  v.severity === 'MAJOR' ? 'bg-orange-600 text-white' :
                  'bg-yellow-600 text-white'
                }`}>
                  {v.severity}
                </div>
              </div>
              <div className="text-sm text-orange-800">{v.description}</div>
              <div className="text-xs text-orange-600 mt-1">Date: {v.date}</div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
              <span className="text-xl">✓</span>
              <span>ALLOWED ACTIONS</span>
            </div>
            <ul className="space-y-1">
              {capabilities.allowed.map((action: string, idx: number) => (
                <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
              <span className="text-xl">✗</span>
              <span>FORBIDDEN ACTIONS</span>
            </div>
            <ul className="space-y-1">
              {capabilities.forbidden.map((action: string, idx: number) => (
                <li key={idx} className="text-sm text-red-800 font-semibold flex items-start gap-2">
                  <span className="text-red-600 flex-shrink-0">✗</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {capabilities.max_ratio > 0 && (
          <div className="mt-4 bg-blue-50 rounded p-3 border-2 border-blue-300">
            <div className="text-sm font-bold text-blue-900 mb-1">STAFFING RATIO REQUIREMENT</div>
            <div className="text-sm text-blue-800">
              Maximum residents per {caregiver.role}: {capabilities.max_ratio}
            </div>
            <div className="text-xs text-blue-700 mt-1">
              Exceeding this ratio is a regulatory violation and compromises care quality.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
