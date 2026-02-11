import React from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { ShowcaseRole } from '../config/showcase';

const ROLE_LABELS: Record<ShowcaseRole, string> = {
  AGENCY_ADMIN: 'Agency Admin',
  SUPERVISOR: 'Supervisor',
  CAREGIVER: 'Caregiver',
  SENIOR: 'Senior',
  FAMILY_VIEWER: 'Family Member'
};

const ROLE_COLORS: Record<ShowcaseRole, string> = {
  AGENCY_ADMIN: 'bg-purple-600',
  SUPERVISOR: 'bg-blue-600',
  CAREGIVER: 'bg-green-600',
  SENIOR: 'bg-orange-600',
  FAMILY_VIEWER: 'bg-teal-600'
};

export function ShowcaseRoleSwitcher() {
  const { isShowcaseMode, currentRole, setRole, currentScenario } = useShowcase();

  if (!isShowcaseMode || !currentScenario) {
    return null;
  }

  const roles: ShowcaseRole[] = ['AGENCY_ADMIN', 'SUPERVISOR', 'CAREGIVER', 'SENIOR', 'FAMILY_VIEWER'];

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border-2 border-yellow-400 p-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Showcase Mode
            </span>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Viewing as:</span>
            <select
              value={currentRole || ''}
              onChange={(e) => setRole(e.target.value as ShowcaseRole)}
              className={`text-xs font-medium px-3 py-1.5 rounded ${
                currentRole ? ROLE_COLORS[currentRole] : 'bg-gray-600'
              } text-white border-none focus:ring-2 focus:ring-yellow-400 cursor-pointer`}
            >
              {roles.map(role => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="mt-2 bg-blue-50 rounded-lg shadow-md border border-blue-200 p-2 text-xs text-blue-800">
        <strong>Scenario:</strong> {currentScenario.name}
      </div>
    </div>
  );
}
