import React from 'react';
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
import { CognitiveAuthorityDemo } from './showcase/CognitiveAuthorityDemo';
import { ShowcaseDecisionSpineView } from './ShowcaseDecisionSpineView';
import { DailyWorkPlanner } from './DailyWorkPlanner';
import { DepartmentalWorkboard } from './DepartmentalWorkboard';
import { ShowcaseDepartmentView } from './ShowcaseDepartmentView';
import { DepartmentsPage } from './DepartmentsPage';
import { AIIntelligenceDashboard } from './AIIntelligenceDashboard';
import { SupervisorResidentsPage } from './showcase/SupervisorResidentsPage';
import { SupervisorAutomationPage } from './showcase/SupervisorAutomationPage';

export const SupervisorHome: React.FC = () => {
  return (
    <ShowcaseNavWrapper role="SUPERVISOR">
      {(activeTab) => {
        switch (activeTab) {
          case 'home':
            return (
              <div className="space-y-6">
                <ShowcaseDepartmentView />
              </div>
            );
          case 'departments':
            return (
              <div className="p-6">
                <DepartmentsPage />
              </div>
            );
          case 'ai-intelligence':
            return <AIIntelligenceDashboard />;
          case 'scheduling':
            return <DailyWorkPlanner />;
          case 'alerts':
            return (
              <div className="space-y-6 p-6">
                <AnomalyDetectionDashboard />
                <SupervisorAlertsPage />
              </div>
            );
          case 'residents':
            return <SupervisorResidentsPage />;
          case 'safety':
            return <ResidentSafetyTrackingPage />;
          case 'devices':
            return <DeviceManagementPage />;
          case 'automation':
            return <SupervisorAutomationPage />;
          case 'reports':
            return <IncidentReportsPage role="SUPERVISOR" />;
          case 'insurance':
            return <InsuranceEvidencePage />;
          case 'review':
            return (
              <div className="space-y-6">
                <DepartmentalWorkboard />
              </div>
            );
          case 'staff':
            return (
              <div className="space-y-6 p-6">
                <TrainingProgressDashboard />
                <WorkloadThresholdDisplay />
                <SupervisorStaffPage />
              </div>
            );
          default:
            return <SupervisorExceptionsView />;
        }
      }}
    </ShowcaseNavWrapper>
  );
};
