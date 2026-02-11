import { useState } from 'react';
import { useAssignments } from '../hooks/useAssignments';
import { useResidents } from '../hooks/useResidents';
import { useAgencyUsers } from '../hooks/useAgencyUsers';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface AgencyAssignmentsProps {
  agencyId: string;
}

export function AgencyAssignments({ agencyId }: AgencyAssignmentsProps) {
  const { assignments, loading, error, assignCaregiver, removeAssignment } = useAssignments(agencyId);
  const { residents } = useResidents(agencyId);
  const { users } = useAgencyUsers(agencyId);
  const { hasPermission } = useUserPermissions();

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedResident, setSelectedResident] = useState('');
  const [selectedCaregiver, setSelectedCaregiver] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'assign' | 'remove';
    assignmentId?: string;
    residentName?: string;
    caregiverName?: string;
  } | null>(null);

  const canManage = hasPermission('assignment.manage');

  const activeResidents = residents.filter((r) => r.status === 'active');
  const caregivers = users.filter((u) =>
    ['CAREGIVER', 'SUPERVISOR', 'AGENCY_ADMIN'].includes(u.role_name) && u.is_active
  );

  const unassignedResidents = activeResidents.filter(
    (resident) =>
      !assignments.some(
        (assignment) => assignment.resident_id === resident.id && assignment.status === 'active'
      )
  );

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resident = residents.find((r) => r.id === selectedResident);
    const caregiver = users.find((u) => u.id === selectedCaregiver);

    setConfirmAction({
      type: 'assign',
      residentName: resident?.full_name,
      caregiverName: caregiver?.display_name || caregiver?.email
    });
  };

  const handleRemove = (assignmentId: string, residentName?: string, caregiverName?: string) => {
    setConfirmAction({
      type: 'remove',
      assignmentId,
      residentName,
      caregiverName
    });
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    setActionError(null);

    try {
      if (confirmAction.type === 'assign') {
        await assignCaregiver(selectedResident, selectedCaregiver);
        setSelectedResident('');
        setSelectedCaregiver('');
        setShowAssignForm(false);
      } else if (confirmAction.type === 'remove' && confirmAction.assignmentId) {
        await removeAssignment(confirmAction.assignmentId);
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

  if (!canManage) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Caregiver Assignments</h1>
          <div className="mt-1 text-sm text-gray-500">
            Manage caregiver-to-resident assignments
          </div>
        </div>
        {unassignedResidents.length > 0 && (
          <button
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showAssignForm ? 'Cancel' : 'Assign Caregiver'}
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

      {showAssignForm && (
        <form onSubmit={handleAssignSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Assignment</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resident
              </label>
              <select
                value={selectedResident}
                onChange={(e) => setSelectedResident(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a resident...</option>
                {unassignedResidents.map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caregiver
              </label>
              <select
                value={selectedCaregiver}
                onChange={(e) => setSelectedCaregiver(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a caregiver...</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver.id} value={caregiver.id}>
                    {caregiver.display_name || caregiver.email} ({caregiver.role_name})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Assignment
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500 italic">
            One active assignment per resident. All assignments are auditable.
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Active Assignments</h2>
        </div>
        {assignments.filter((a) => a.status === 'active').length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No active assignments.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resident
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caregiver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments
                .filter((a) => a.status === 'active')
                .map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {assignment.resident?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.caregiver?.display_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() =>
                          handleRemove(
                            assignment.id,
                            assignment.resident?.full_name,
                            assignment.caregiver?.display_name || undefined
                          )
                        }
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Assignment History</h2>
        </div>
        {assignments.filter((a) => a.status === 'removed').length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No removed assignments.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resident
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caregiver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Removed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments
                .filter((a) => a.status === 'removed')
                .map((assignment) => (
                  <tr key={assignment.id} className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {assignment.resident?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {assignment.caregiver?.display_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.removed_at
                        ? new Date(assignment.removed_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Action
            </h2>
            <p className="text-gray-600 mb-6">
              {confirmAction.type === 'assign' &&
                `Assign ${confirmAction.caregiverName} to ${confirmAction.residentName}?`}
              {confirmAction.type === 'remove' &&
                `Remove assignment of ${confirmAction.caregiverName} from ${confirmAction.residentName}?`}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-800">
                This action is auditable and will be recorded in the audit log.
              </p>
            </div>
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
