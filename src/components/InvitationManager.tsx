import { useState } from 'react';
import { useInvitations } from '../hooks/useInvitations';

interface Props {
  agencyId: string;
  availableRoles: { id: string; name: string }[];
  availableResidents: { id: string; name: string }[];
}

export function InvitationManager({ availableRoles, availableResidents }: Props) {
  const { invitations, loading, error, createInvitation, revokeInvitation } = useInvitations();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    targetEmail: '',
    targetPhone: '',
    intendedRoleId: '',
    residentScope: [] as string[],
    expiresInDays: 7
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!formData.targetEmail && !formData.targetPhone) {
      setCreateError('Either email or phone must be provided');
      return;
    }

    if (!formData.intendedRoleId) {
      setCreateError('Role is required');
      return;
    }

    if (formData.residentScope.length === 0) {
      setCreateError('At least one resident must be selected');
      return;
    }

    try {
      setCreating(true);
      await createInvitation({
        target_email: formData.targetEmail || undefined,
        target_phone: formData.targetPhone || undefined,
        intended_role_id: formData.intendedRoleId,
        resident_scope: formData.residentScope,
        expires_in_days: formData.expiresInDays
      });

      setFormData({
        targetEmail: '',
        targetPhone: '',
        intendedRoleId: '',
        residentScope: [],
        expiresInDays: 7
      });
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create invitation');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await revokeInvitation(invitationId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleToggleResident = (residentId: string) => {
    setFormData(prev => ({
      ...prev,
      residentScope: prev.residentScope.includes(residentId)
        ? prev.residentScope.filter(id => id !== residentId)
        : [...prev.residentScope, residentId]
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Invitation Management</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {showCreateForm ? 'Cancel' : 'Create Invitation'}
          </button>
        </div>
        <p className="text-gray-600">
          Manage user invitations. Invitations are single-use and time-bound.
        </p>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Invitation</h3>

          {createError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-red-800">{createError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.targetEmail}
                  onChange={(e) => setFormData({ ...formData, targetEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={formData.targetPhone}
                  onChange={(e) => setFormData({ ...formData, targetPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.intendedRoleId}
                  onChange={(e) => setFormData({ ...formData, intendedRoleId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select role...</option>
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires In (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.expiresInDays}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resident Scope <span className="text-red-600">*</span>
              </label>
              <div className="border border-gray-300 rounded p-3 max-h-48 overflow-y-auto">
                {availableResidents.map(resident => (
                  <label key={resident.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      checked={formData.residentScope.includes(resident.id)}
                      onChange={() => handleToggleResident(resident.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{resident.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {formData.residentScope.length} resident(s)
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {creating ? 'Creating...' : 'Create Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading invitations...</p>
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending invitations
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map(invitation => (
            <div
              key={invitation.id}
              className="border border-gray-300 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="font-semibold text-gray-900">
                    {invitation.target_email || invitation.target_phone}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    invitation.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : invitation.status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invitation.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Role: <span className="font-medium">{invitation.role_name}</span></p>
                  <p>Residents: <span className="font-medium">{invitation.resident_count}</span></p>
                  <p>Invited by: <span className="font-medium">{invitation.invited_by_name}</span></p>
                  {invitation.expires_at && (
                    <p>Expires: <span className="font-medium">{new Date(invitation.expires_at).toLocaleString()}</span></p>
                  )}
                </div>
              </div>

              {invitation.status === 'PENDING' && (
                <button
                  onClick={() => handleRevoke(invitation.id)}
                  className="ml-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
