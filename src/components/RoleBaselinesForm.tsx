import { useState } from 'react';

interface Props {
  agencyId: string;
  onSave: (baselines: any[]) => Promise<any>;
  onError: (error: string | null) => void;
}

const ROLES = [
  { name: 'CAREGIVER', label: 'Caregiver', description: 'Direct care providers' },
  { name: 'SUPERVISOR', label: 'Supervisor', description: 'Care team managers' },
  { name: 'FAMILY_VIEWER', label: 'Family Viewer', description: 'Family members with read access' },
  { name: 'SENIOR', label: 'Senior', description: 'Care recipients' }
];

const PERMISSIONS = [
  { key: 'view_care_status', label: 'View Care Status', group: 'Care' },
  { key: 'update_care_state', label: 'Update Care State', group: 'Care' },
  { key: 'view_timeline', label: 'View Care Timeline', group: 'Care' },
  { key: 'view_residents', label: 'View Residents', group: 'Residents' },
  { key: 'create_residents', label: 'Create Residents', group: 'Residents' },
  { key: 'update_residents', label: 'Update Residents', group: 'Residents' },
  { key: 'view_caregivers', label: 'View Caregivers', group: 'Users' },
  { key: 'manage_assignments', label: 'Manage Assignments', group: 'Users' },
  { key: 'view_audit_log', label: 'View Audit Log', group: 'Audit' },
  { key: 'view_system_health', label: 'View System Health', group: 'System' },
  { key: 'trigger_emergency', label: 'Trigger Emergency', group: 'Emergency' },
  { key: 'acknowledge_emergency', label: 'Acknowledge Emergency', group: 'Emergency' },
  { key: 'submit_ai_input', label: 'Submit AI Learning Input', group: 'AI' }
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  CAREGIVER: ['view_care_status', 'update_care_state', 'view_timeline', 'view_residents', 'trigger_emergency', 'submit_ai_input'],
  SUPERVISOR: ['view_care_status', 'update_care_state', 'view_timeline', 'view_residents', 'create_residents', 'update_residents', 'view_caregivers', 'manage_assignments', 'view_audit_log', 'view_system_health', 'trigger_emergency', 'acknowledge_emergency', 'submit_ai_input'],
  FAMILY_VIEWER: ['view_care_status', 'view_timeline', 'view_residents'],
  SENIOR: ['view_care_status', 'view_timeline']
};

export function RoleBaselinesForm({ onSave, onError }: Props) {
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  const handleTogglePermission = (roleName: string, permission: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [roleName]: prev[roleName].includes(permission)
        ? prev[roleName].filter(p => p !== permission)
        : [...prev[roleName], permission]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    const baselines = ROLES.map(role => ({
      role_name: role.name,
      permissions: rolePermissions[role.name] || []
    }));

    try {
      setSaving(true);
      await onSave(baselines);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to save role baselines');
    } finally {
      setSaving(false);
    }
  };

  const permissionsByGroup = PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {} as Record<string, typeof PERMISSIONS>);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          State 4: Role Defaults & Permission Baselines
        </h2>
        <p className="text-gray-600">
          Define default permissions for each role. These will be automatically applied to new users.
        </p>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Auto-Apply Behavior</h3>
            <p className="text-sm text-blue-800">
              These permission baselines will be <strong>automatically applied</strong> to all new users created with these roles.
              Overrides to individual users will require explicit audit logging.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {ROLES.map(role => (
          <div key={role.name} className="border border-gray-300 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{role.label}</h3>
              <p className="text-sm text-gray-600">{role.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {rolePermissions[role.name]?.length || 0} permissions selected
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(permissionsByGroup).map(([group, perms]) => (
                <div key={group}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{group}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map(perm => (
                      <label key={perm.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={rolePermissions[role.name]?.includes(perm.key) || false}
                          onChange={() => handleTogglePermission(role.name, perm.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Enforcement Rules</h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Defaults apply automatically to new users</li>
            <li>Overrides require explicit audit logging</li>
            <li>Permissions are versioned for compliance tracking</li>
            <li>Changes to baselines do NOT affect existing users retroactively</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Saving...' : 'Save & Continue to State 5'}
          </button>
        </div>
      </form>
    </div>
  );
}
