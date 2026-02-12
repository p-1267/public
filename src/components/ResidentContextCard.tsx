import { useCareContext } from '../contexts/CareContextProvider';
import { AlertCircle, Home, Settings, Users } from 'lucide-react';

export function ResidentContextCard() {
  const { context, loading, error, createDefault } = useCareContext();

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-100 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-100 rounded w-48 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 mb-1">Care Context Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 mb-1">No Active Care Context</h3>
            <p className="text-sm text-amber-700 mb-3">
              A care context is required to determine service configuration.
            </p>
            <button
              onClick={() => createDefault(context?.resident_id || '')}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              Create Default Context
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getManagementIcon = () => {
    switch (context.management_mode) {
      case 'SELF':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'FAMILY_MANAGED':
        return <Home className="w-5 h-5 text-green-600" />;
      case 'AGENCY_MANAGED':
        return <Settings className="w-5 h-5 text-purple-600" />;
      default:
        return <Settings className="w-5 h-5 text-gray-600" />;
    }
  };

  const getManagementLabel = () => {
    switch (context.management_mode) {
      case 'SELF':
        return 'Self-Managed';
      case 'FAMILY_MANAGED':
        return 'Family-Managed';
      case 'AGENCY_MANAGED':
        return 'Agency-Managed';
      default:
        return context.management_mode;
    }
  };

  const getServiceLabel = () => {
    switch (context.service_model) {
      case 'NONE':
        return 'No Services';
      case 'DIRECT_HIRE':
        return 'Direct Hire';
      case 'AGENCY_HOME_CARE':
        return 'Agency Home Care';
      case 'AGENCY_FACILITY':
        return 'Agency Facility';
      default:
        return context.service_model;
    }
  };

  const getSettingLabel = () => {
    switch (context.care_setting) {
      case 'IN_HOME':
        return 'In-Home';
      case 'FACILITY':
        return 'Facility';
      default:
        return context.care_setting;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          {getManagementIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {getManagementLabel()}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="font-medium">Setting:</span> {getSettingLabel()}
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">Model:</span> {getServiceLabel()}
            </span>
            {context.supervision_enabled && (
              <span className="flex items-center gap-1 text-amber-700">
                <span className="font-medium">Supervision:</span> Enabled
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
