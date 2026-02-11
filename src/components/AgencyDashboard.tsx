import { useAgency } from '../hooks/useAgency';
import { useBrainState } from '../hooks/useBrainState';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface AgencyDashboardProps {
  agencyId: string;
}

export function AgencyDashboard({ agencyId }: AgencyDashboardProps) {
  const { agency, stats, loading, error } = useAgency(agencyId);
  const { brainState } = useBrainState();
  const { hasPermission } = useUserPermissions();

  const canView = hasPermission('agency.view');

  if (!canView) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading agency information...</div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="p-6">
        <div className="text-red-600">
          {error || 'Agency not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          {agency.name}
        </h1>
        <div className="mt-1 text-sm text-gray-500">
          Agency Control Panel
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Users
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats?.userCount || 0}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Active users in agency
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Residents
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats?.residentCount || 0}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Active care recipients
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Caregivers
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats?.activeCaregivers || 0}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Active assignments
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Agency Status
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <div className="mt-1 font-medium text-gray-900 capitalize">
              {agency.status}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Created</div>
            <div className="mt-1 font-medium text-gray-900">
              {new Date(agency.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          System State Snapshot
        </h2>
        <div className="text-sm text-gray-600">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-500">Current State</div>
              <div className="mt-1 font-medium text-gray-900">
                {brainState?.current_state || 'UNKNOWN'}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Last Updated</div>
              <div className="mt-1 font-medium text-gray-900">
                {brainState?.last_transition_at
                  ? new Date(brainState.last_transition_at).toLocaleString()
                  : 'Never'}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500 italic">
          Read-only operational state. Agency admin has no authority over Brain state.
        </div>
      </div>
    </div>
  );
}
