import { useState } from 'react';
import { useUserAccess } from '../hooks/useUserAccess';

interface Props {
  targetUserId?: string;
  userName?: string;
}

export function UserAccessManager({ targetUserId, userName }: Props) {
  const { memberships, loading, error, revokeAccess, suspendUser, reactivateUser, revokeMembership } = useUserAccess(targetUserId);
  const [action, setAction] = useState<'revoke' | 'suspend' | 'reactivate' | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRevokeAccess = async () => {
    if (!reason.trim()) {
      setActionError('Reason is required for revocation');
      return;
    }

    if (!confirm('Are you sure you want to PERMANENTLY revoke ALL access for this user? This action is IRREVERSIBLE.')) {
      return;
    }

    try {
      setProcessing(true);
      setActionError(null);
      await revokeAccess(targetUserId!, reason);
      setReason('');
      setAction(null);
      alert('User access revoked successfully');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke access');
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!reason.trim()) {
      setActionError('Reason is required for suspension');
      return;
    }

    if (!confirm('Are you sure you want to temporarily suspend this user?')) {
      return;
    }

    try {
      setProcessing(true);
      setActionError(null);
      await suspendUser(targetUserId!, reason);
      setReason('');
      setAction(null);
      alert('User suspended successfully');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to suspend user');
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivateUser = async () => {
    if (!confirm('Are you sure you want to reactivate this user?')) {
      return;
    }

    try {
      setProcessing(true);
      setActionError(null);
      await reactivateUser(targetUserId!);
      setAction(null);
      alert('User reactivated successfully');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reactivate user');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeMembership = async (membershipId: string) => {
    const reason = prompt('Enter reason for revoking this specific membership:');
    if (!reason) return;

    try {
      await revokeMembership(membershipId, reason);
      alert('Membership revoked successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke membership');
    }
  };

  const activeMemberships = memberships.filter(m => m.is_active);
  const revokedMemberships = memberships.filter(m => !m.is_active);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          User Access Management {userName && `— ${userName}`}
        </h2>
        <p className="text-gray-600">
          Manage user memberships and access. All actions are immediately effective and fully audited.
        </p>
      </div>

      {targetUserId && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">User Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAction('suspend')}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-700 transition"
            >
              Suspend User
            </button>
            <button
              onClick={() => setAction('reactivate')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
            >
              Reactivate User
            </button>
            <button
              onClick={() => setAction('revoke')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
            >
              Revoke All Access
            </button>
          </div>

          {action && (
            <div className="mt-4 p-4 border-t border-gray-300">
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                  <p className="text-sm text-red-800">{actionError}</p>
                </div>
              )}

              {action === 'revoke' && (
                <div>
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                    <p className="text-sm font-semibold text-red-900">
                      WARNING: This action is PERMANENT and IRREVERSIBLE
                    </p>
                    <p className="text-sm text-red-800 mt-1">
                      All memberships will be revoked. All devices will be revoked.
                      All sessions will be invalidated. Offline access will be blocked.
                    </p>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Revocation <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Enter detailed reason for permanent revocation..."
                    required
                  />
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      onClick={() => { setAction(null); setReason(''); setActionError(null); }}
                      className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRevokeAccess}
                      disabled={processing || !reason.trim()}
                      className="bg-red-600 text-white px-6 py-2 rounded font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Revoking...' : 'Revoke All Access'}
                    </button>
                  </div>
                </div>
              )}

              {action === 'suspend' && (
                <div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                    <p className="text-sm font-semibold text-yellow-900">
                      Temporary Suspension (Reversible)
                    </p>
                    <p className="text-sm text-yellow-800 mt-1">
                      User will be temporarily blocked but can be reactivated later.
                    </p>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Suspension <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                    rows={3}
                    placeholder="Enter reason for suspension..."
                    required
                  />
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      onClick={() => { setAction(null); setReason(''); setActionError(null); }}
                      className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSuspendUser}
                      disabled={processing || !reason.trim()}
                      className="bg-yellow-600 text-white px-6 py-2 rounded font-semibold hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Suspending...' : 'Suspend User'}
                    </button>
                  </div>
                </div>
              )}

              {action === 'reactivate' && (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                    <p className="text-sm font-semibold text-green-900">
                      Reactivate Suspended User
                    </p>
                    <p className="text-sm text-green-800 mt-1">
                      User will regain access to their assigned memberships.
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      onClick={() => { setAction(null); setActionError(null); }}
                      className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReactivateUser}
                      disabled={processing}
                      className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {processing ? 'Reactivating...' : 'Reactivate User'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
          <p className="text-gray-600">Loading memberships...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Active Memberships ({activeMemberships.length})
            </h3>
            {activeMemberships.length === 0 ? (
              <p className="text-gray-500">No active memberships</p>
            ) : (
              <div className="space-y-3">
                {activeMemberships.map(membership => (
                  <div
                    key={membership.id}
                    className="border border-gray-300 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-gray-900">{membership.resident_name}</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Role: <span className="font-medium">{membership.role_name}</span></p>
                        <p>Granted by: <span className="font-medium">{membership.granted_by_name}</span></p>
                        <p>Granted: <span className="font-medium">{new Date(membership.granted_at).toLocaleString()}</span></p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeMembership(membership.id)}
                      className="ml-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {revokedMemberships.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Revoked Memberships ({revokedMemberships.length})
              </h3>
              <div className="space-y-3">
                {revokedMemberships.map(membership => (
                  <div
                    key={membership.id}
                    className="border border-gray-300 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold text-gray-900">{membership.resident_name}</span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        Revoked
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Role: <span className="font-medium">{membership.role_name}</span></p>
                      <p>Granted: <span className="font-medium">{new Date(membership.granted_at).toLocaleString()}</span></p>
                      {membership.revoked_at && (
                        <p>Revoked: <span className="font-medium">{new Date(membership.revoked_at).toLocaleString()}</span></p>
                      )}
                      {membership.revoked_reason && (
                        <p>Reason: <span className="font-medium">{membership.revoked_reason}</span></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
