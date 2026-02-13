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
import { useShowcase } from '../contexts/ShowcaseContext';
import { isRoleActiveInScenario } from '../config/roleVisibilityMatrix';

export const SupervisorHome: React.FC = () => {
  const { currentRole, currentScenario } = useShowcase();

  if (!isRoleActiveInScenario(currentRole, currentScenario?.id || null)) {
    return (
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '64px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fef3c7',
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          padding: '48px',
          color: '#92400e'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
            Role Not Active in This Scenario
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '24px' }}>
            The <strong>{currentRole}</strong> role is not available in scenario <strong>{currentScenario?.id}</strong>.
          </p>
          <p style={{ fontSize: '14px', color: '#78350f' }}>
            Supervisors are only active in scenarios D (Agency Home Care) and E (Agency Facility).
          </p>
        </div>
      </div>
    );
  }

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
