import { useState } from 'react';
import { useAgencyUsers } from '../hooks/useAgencyUsers';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface AgencyUsersProps {
  agencyId: string;
}

export function AgencyUsers({ agencyId }: AgencyUsersProps) {
  const { users, loading, error, inviteUser, assignRole, deactivateUser } = useAgencyUsers(agencyId);
  const { hasPermission } = useUserPermissions();

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('CAREGIVER');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'invite' | 'role' | 'deactivate';
    userId?: string;
    email?: string;
    role?: string;
  } | null>(null);

  const canInvite = hasPermission('user.invite');
  const canAssignRole = hasPermission('user.assign_role');
  const canDeactivate = hasPermission('user.deactivate');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmAction({ type: 'invite', email: inviteEmail, role: inviteRole });
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setConfirmAction({ type: 'role', userId, role: newRole });
  };

  const handleDeactivate = (userId: string) => {
    setConfirmAction({ type: 'deactivate', userId });
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    setActionError(null);

    try {
      if (confirmAction.type === 'invite' && confirmAction.email && confirmAction.role) {
        await inviteUser(confirmAction.email, confirmAction.role);
        setInviteEmail('');
        setInviteRole('CAREGIVER');
        setShowInviteForm(false);
      } else if (confirmAction.type === 'role' && confirmAction.userId && confirmAction.role) {
        await assignRole(confirmAction.userId, confirmAction.role);
      } else if (confirmAction.type === 'deactivate' && confirmAction.userId) {
        await deactivateUser(confirmAction.userId);
      }
      setConfirmAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelAction = () => {
    setConfirmAction(null);
    setActionError(null);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agency Users</h1>
          <div className="mt-1 text-sm text-gray-500">
            Manage users and role assignments
          </div>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showInviteForm ? 'Cancel' : 'Invite User'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {actionError}
        </div>
      )}

      {showInviteForm && canInvite && (
        <form onSubmit={handleInviteSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CAREGIVER">Caregiver</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="AGENCY_ADMIN">Agency Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send Invitation
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.display_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {canAssignRole ? (
                    <select
                      value={user.role_name}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="CAREGIVER">Caregiver</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="AGENCY_ADMIN">Agency Admin</option>
                      <option value="FAMILY_VIEWER">Family Viewer</option>
                    </select>
                  ) : (
                    user.role_name
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {canDeactivate && user.is_active && (
                    <button
                      onClick={() => handleDeactivate(user.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Action
            </h2>
            <p className="text-gray-600 mb-6">
              {confirmAction.type === 'invite' &&
                `Invite ${confirmAction.email} as ${confirmAction.role}?`}
              {confirmAction.type === 'role' &&
                `Change user role to ${confirmAction.role}?`}
              {confirmAction.type === 'deactivate' &&
                'Deactivate this user account?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={executeAction}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={cancelAction}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
