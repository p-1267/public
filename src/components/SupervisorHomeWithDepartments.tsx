import { useState, useEffect } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';
import { ShowcaseNavWrapper } from './ShowcaseNavWrapper';
import { SupervisorExceptionsView } from './cognitive/SupervisorExceptionsView';
import { SupervisorSchedulingPage } from './showcase/SupervisorSchedulingPage';
import { SupervisorAlertsPage } from './showcase/SupervisorAlertsPage';
import { ResidentSafetyTrackingPage } from './showcase/ResidentSafetyTrackingPage';
import { DeviceManagementPage } from './showcase/DeviceManagementPage';
import { IncidentReportsPage } from './showcase/IncidentReportsPage';
import { InsuranceEvidencePage } from './showcase/InsuranceEvidencePage';
import { SupervisorReviewPage } from './showcase/SupervisorReviewPage';
import { SupervisorStaffPage } from './showcase/SupervisorStaffPage';
import { WorkloadThresholdDisplay } from './WorkloadThresholdDisplay';
import { AutomationStatusPanel } from './AutomationStatusPanel';
import { AnomalyDetectionDashboard } from './AnomalyDetectionDashboard';
import { OverrideAuditTrail } from './OverrideAuditTrail';
import { TrainingProgressDashboard } from './TrainingProgressDashboard';
import { ShowcaseDecisionSpineView } from './ShowcaseDecisionSpineView';
import { Level4ActivePanel } from './Level4ActivePanel';
import { NursingWorkboard } from './NursingWorkboard';
import { HousekeepingWorkboard } from './HousekeepingWorkboard';
import { KitchenWorkboard } from './KitchenWorkboard';
import { OperatingMode } from '../types/operationalModel';
import { DailyWorkPlanner } from './DailyWorkPlanner';
import { DepartmentalWorkboard } from './DepartmentalWorkboard';
import { SupervisorOperationalConsole } from './SupervisorOperationalConsole';
import { AIIntelligenceDashboard } from './AIIntelligenceDashboard';

export const SupervisorHomeWithDepartments: React.FC = () => {
  console.log('[SupervisorHomeWithDepartments] Component mounting...');

  const showcaseContext = useShowcase();
  console.log('[SupervisorHomeWithDepartments] showcaseContext:', showcaseContext ? 'exists' : 'NULL');

  const { operatingMode, setOperatingMode, operationalData } = showcaseContext || {};
  console.log('[SupervisorHomeWithDepartments] operatingMode:', operatingMode);

  const [departmentTab, setDepartmentTab] = useState<'overview' | 'nursing' | 'housekeeping' | 'kitchen'>('overview');

  useEffect(() => {
    console.log('[SupervisorHomeWithDepartments] useEffect - operatingMode:', operatingMode, 'operationalData:', operationalData ? 'exists' : 'null');
    if (setOperatingMode && !operationalData && operatingMode) {
      console.log('[SupervisorHomeWithDepartments] Calling setOperatingMode...');
      setOperatingMode(operatingMode);
    }
  }, [operatingMode, operationalData, setOperatingMode]);

  if (!showcaseContext) {
    console.log('[SupervisorHomeWithDepartments] Returning loading state - no context');
    return (
      <div className="p-6 text-center">
        <div className="text-xl font-bold text-gray-900">Loading showcase context...</div>
      </div>
    );
  }

  console.log('[SupervisorHomeWithDepartments] About to render ShowcaseNavWrapper...');

  return (
    <ShowcaseNavWrapper role="SUPERVISOR">
      {(activeTab) => {
        try {
          if (activeTab === 'home') {
            console.log('[SUP_TAB] dashboard mounted - SupervisorOperationalConsole');
            return <SupervisorOperationalConsole />;
          }

          if (activeTab === 'ai-intelligence') {
            console.log('[SUP_TAB] ai-intelligence mounted - Level4ActivePanel');
            return (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="text-sm text-slate-600 mb-4">
                    Predictive intelligence with risk forecasting and pattern recognition
                  </div>
                  <Level4ActivePanel showToggle={true} />
                </div>
              </div>
            );
          }

          if (activeTab === 'departments') {
            console.log('[SUP_TAB] departments mounted - ShowcaseDecisionSpineView');
            return (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-2xl font-bold text-slate-900">Department Operations</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDepartmentTab('overview')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${
                          departmentTab === 'overview'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setDepartmentTab('nursing')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${
                          departmentTab === 'nursing'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Nursing
                      </button>
                      <button
                        onClick={() => setDepartmentTab('housekeeping')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${
                          departmentTab === 'housekeeping'
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Housekeeping
                      </button>
                      <button
                        onClick={() => setDepartmentTab('kitchen')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm ${
                          departmentTab === 'kitchen'
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Kitchen
                      </button>
                    </div>
                  </div>

                  {departmentTab === 'overview' && <ShowcaseDecisionSpineView />}
                  {departmentTab === 'nursing' && <NursingWorkboard operatingMode={operatingMode || 'AGENCY'} />}
                  {departmentTab === 'housekeeping' && <HousekeepingWorkboard operatingMode={operatingMode || 'AGENCY'} />}
                  {departmentTab === 'kitchen' && <KitchenWorkboard operatingMode={operatingMode || 'AGENCY'} />}
                </div>
              </div>
            );
          }

        switch (activeTab) {
          case 'scheduling':
            return <DailyWorkPlanner />;
          case 'alerts':
            return (
              <div className="space-y-6">
                <SupervisorAlertsPage />
                <WorkloadThresholdDisplay />
                <AnomalyDetectionDashboard />
              </div>
            );
          case 'residents':
            return <ResidentSafetyTrackingPage />;
          case 'staff':
            return (
              <div className="space-y-6">
                <SupervisorStaffPage />
                <TrainingProgressDashboard />
              </div>
            );
          case 'reports':
            return (
              <div className="space-y-6">
                <InsuranceEvidencePage />
                <IncidentReportsPage />
              </div>
            );
          case 'review':
            return (
              <div className="space-y-6">
                <DepartmentalWorkboard />
              </div>
            );
          case 'insurance':
            return <InsuranceEvidencePage />;
          case 'devices':
            return <DeviceManagementPage />;
          case 'automation':
            return (
              <div className="space-y-6">
                <AutomationStatusPanel />
                <SupervisorExceptionsView />
              </div>
            );
          default:
            return (
              <div className="p-6 text-center text-gray-600">
                Select a navigation item
              </div>
            );
        }
        } catch (error) {
          console.error('[SupervisorHome] Error rendering tab:', activeTab, error);
          return (
            <div className="p-6">
              <div className="bg-red-100 border-2 border-red-500 rounded-lg p-6">
                <div className="text-2xl font-bold text-red-900 mb-2">Error Loading Supervisor View</div>
                <div className="text-red-700 mb-4">
                  There was an error loading this tab. Please try a different tab or refresh the page.
                </div>
                <div className="text-sm text-red-600 font-mono bg-red-50 p-3 rounded">
                  Tab: {activeTab}
                  <br />
                  Error: {error instanceof Error ? error.message : String(error)}
                </div>
              </div>
            </div>
          );
        }
      }}
    </ShowcaseNavWrapper>
  );
};
