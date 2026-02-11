import { useState } from 'react';
import { useResidents } from '../hooks/useResidents';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface AgencyResidentsProps {
  agencyId: string;
}

export function AgencyResidents({ agencyId }: AgencyResidentsProps) {
  const { residents, loading, error, registerResident } = useResidents(agencyId);
  const { hasPermission } = useUserPermissions();

  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRegister, setConfirmRegister] = useState(false);

  const canCreate = hasPermission('resident.create');
  const canView = hasPermission('resident.view');

  console.log('[AgencyResidents] Permissions check:', {
    canCreate,
    canView,
    residentsCount: residents.length,
    loading,
    error
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmRegister(true);
  };

  const executeRegister = async () => {
    setActionLoading(true);
    setActionError(null);

    try {
      await registerResident(fullName, dateOfBirth);
      setFullName('');
      setDateOfBirth('');
      setShowRegisterForm(false);
      setConfirmRegister(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRegister = () => {
    setConfirmRegister(false);
    setActionError(null);
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (!canView) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading residents...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Residents</h1>
          <div className="mt-1 text-sm text-gray-500">
            {residents.length} care recipients
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowRegisterForm(!showRegisterForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showRegisterForm ? 'Cancel' : 'Register Resident'}
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

      {showRegisterForm && canCreate && (
        <form onSubmit={handleRegisterSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Register New Resident</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Register Resident
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500 italic">
            Registration is permanent and auditable. Identity fields cannot be edited later.
          </div>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {residents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No residents registered yet.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {residents.map((resident) => (
                <tr key={resident.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {resident.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {resident.metadata?.room || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {calculateAge(resident.date_of_birth)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {resident.metadata?.diet || 'normal'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        resident.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : resident.status === 'discharged'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {resident.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => alert(`View details for ${resident.full_name}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                    <button
                      onClick={() => alert(`Edit ${resident.full_name} (feature coming soon)`)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Registration
            </h2>
            <p className="text-gray-600 mb-4">
              Register <strong>{fullName}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Date of Birth: {new Date(dateOfBirth).toLocaleDateString()}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-800">
                This action is auditable and permanent. Identity fields cannot be changed after registration.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={executeRegister}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Registering...' : 'Confirm'}
              </button>
              <button
                onClick={cancelRegister}
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
