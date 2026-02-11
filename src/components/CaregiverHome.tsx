import React from 'react';
import { ShowcaseNavWrapper } from './ShowcaseNavWrapper';
import { CaregiverCognitiveView } from './cognitive/CaregiverCognitiveView';
import { CaregiverCareLogPage } from './showcase/CaregiverCareLogPage';
import { CaregiverMedicationsPage } from './showcase/CaregiverMedicationsPage';
import { CaregiverResidentsPage } from './showcase/CaregiverResidentsPage';
import { CaregiverShiftPage } from './showcase/CaregiverShiftPage';
import { CaregiverVoiceDocPage } from './showcase/CaregiverVoiceDocPage';
import { TrainingProgressDashboard } from './TrainingProgressDashboard';
import { CaregiverExecutionUI } from './CaregiverExecutionUI';
import { DepartmentsPage } from './DepartmentsPage';
import { useShowcase } from '../contexts/ShowcaseContext';

export const CaregiverHome: React.FC = () => {
  const { mockUserId } = useShowcase();

  return (
    <ShowcaseNavWrapper role="CAREGIVER">
      {(activeTab) => {
        switch (activeTab) {
          case 'home':
            return <CaregiverCognitiveView />;
          case 'departments':
            return (
              <div className="p-6">
                <DepartmentsPage />
              </div>
            );
          case 'assignments':
            return mockUserId ? (
              <div className="p-6">
                <CaregiverExecutionUI caregiverId={mockUserId} />
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                Loading caregiver data...
              </div>
            );
          case 'residents':
            return <CaregiverResidentsPage />;
          case 'medications':
            return <CaregiverMedicationsPage />;
          case 'care-log':
            return <CaregiverCareLogPage />;
          case 'voice-doc':
            return <CaregiverVoiceDocPage />;
          case 'reports':
            return (
              <div className="p-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">My Reports</h2>
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-4">📊</div>
                    <div className="text-lg">Reports are submitted automatically with task completion.</div>
                    <div className="text-sm mt-2">View detailed shift summaries in the Shift tab.</div>
                  </div>
                </div>
              </div>
            );
          case 'shift':
            return (
              <div className="space-y-6 p-6">
                <CaregiverShiftPage />
                <TrainingProgressDashboard />
              </div>
            );
          default:
            return <CaregiverCognitiveView />;
        }
      }}
    </ShowcaseNavWrapper>
  );
};
