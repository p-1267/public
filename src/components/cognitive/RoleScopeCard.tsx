import React from 'react';
import { useShowcase } from '../../contexts/ShowcaseContext';

export const RoleScopeCard: React.FC = () => {
  const { currentRole, currentScenario } = useShowcase();

  if (!currentScenario || !currentRole) return null;

  const getRoleScope = (role: string) => {
    switch (role) {
      case 'CAREGIVER':
        return {
          title: 'Caregiver — Operational View',
          canDo: [
            'View assigned tasks and complete them with evidence',
            'See urgent alerts and intelligence signals for residents',
            'Document care activities and medication administration',
            'Access resident instant context during care delivery'
          ],
          cannotDo: [
            'Modify resident care plans or baselines',
            'Access agency billing or financial reports',
            'Assign tasks to other caregivers',
            'View supervisor-level analytics and projections'
          ]
        };
      case 'SUPERVISOR':
        return {
          title: 'Supervisor — Management View',
          canDo: [
            'Assign tasks to caregivers and manage daily work plans',
            'Review completed tasks and resolve exceptions',
            'Access departmental workboards and staff schedules',
            'View intelligence signals across all residents'
          ],
          cannotDo: [
            'Modify agency-level policies or billing configuration',
            'Create new users or change role permissions',
            'Access agency financial exports',
            'Modify system-wide settings'
          ]
        };
      case 'FAMILY_ADMIN':
        return {
          title: 'Family — Oversight View',
          canDo: [
            'Monitor resident health metrics and care timeline',
            'Receive notifications about care events',
            'Submit observations and action requests',
            'View care plan and upcoming appointments'
          ],
          cannotDo: [
            'Complete caregiver tasks or administer medications',
            'Access other residents data',
            'Modify staff schedules or assignments',
            'View operational or financial details'
          ]
        };
      case 'SENIOR':
        return {
          title: 'Senior — Self-Management View',
          canDo: [
            'Log health inputs and vital signs',
            'View own medications and appointments',
            'Access personal care timeline',
            'Manage accessibility preferences'
          ],
          cannotDo: [
            'View care staff schedules or assignments',
            'Access operational intelligence for facility',
            'Modify care plans without provider approval',
            'View other residents data'
          ]
        };
      default:
        return {
          title: `${role} View`,
          canDo: [],
          cannotDo: []
        };
    }
  };

  const scope = getRoleScope(currentRole);

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl">👤</div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 mb-2">{scope.title}</h3>
          <div className="text-sm text-slate-600 mb-3">
            <span className="font-medium">Scenario:</span>{' '}
            {currentScenario.id} — {currentScenario.title}
          </div>

          {scope.canDo.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-700 mb-1">You can:</div>
              <ul className="text-xs text-slate-700 space-y-1">
                {scope.canDo.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scope.cannotDo.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">Not available in this role:</div>
              <ul className="text-xs text-slate-600 space-y-1">
                {scope.cannotDo.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
