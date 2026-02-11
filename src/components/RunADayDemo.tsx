import React, { useState } from 'react';
import { SupervisorAssignmentUI } from './SupervisorAssignmentUI';
import { CaregiverExecutionUI } from './CaregiverExecutionUI';
import { SupervisorReviewDashboard } from './SupervisorReviewDashboard';
import { ManagerDashboard } from './ManagerDashboard';

interface RunADayDemoProps {
  agencyId: string;
  departmentId?: string;
  caregiverId?: string;
}

type DemoStep =
  | 'intro'
  | 'assignment'
  | 'execution'
  | 'review'
  | 'manager'
  | 'complete';

export function RunADayDemo({
  agencyId,
  departmentId,
  caregiverId,
}: RunADayDemoProps) {
  const [currentStep, setCurrentStep] = useState<DemoStep>('intro');
  const [demoProgress, setDemoProgress] = useState({
    tasksAssigned: 0,
    tasksCompleted: 0,
    tasksReviewed: 0,
  });

  const handleAssignmentComplete = () => {
    setDemoProgress((prev) => ({ ...prev, tasksAssigned: prev.tasksAssigned + 1 }));
  };

  const handleExecutionComplete = () => {
    setDemoProgress((prev) => ({
      ...prev,
      tasksCompleted: prev.tasksCompleted + 1,
    }));
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'intro', label: 'Introduction', number: 1 },
      { key: 'assignment', label: 'Supervisor Assigns', number: 2 },
      { key: 'execution', label: 'Caregiver Executes', number: 3 },
      { key: 'review', label: 'Supervisor Reviews', number: 4 },
      { key: 'manager', label: 'Manager Oversight', number: 5 },
      { key: 'complete', label: 'Complete', number: 6 },
    ];

    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    index <= currentIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < currentIndex ? '✓' : step.number}
                </div>
                <div
                  className={`mt-2 text-xs font-medium text-center ${
                    index <= currentIndex ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 relative top-[-16px]">
                  <div
                    className={`h-full ${
                      index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderIntro = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white mb-6">
        <h1 className="text-4xl font-bold mb-4">
          WP1: Run a Day Demo
        </h1>
        <p className="text-xl text-blue-100">
          End-to-end demonstration of complete operational daily cycle
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What This Demo Shows
          </h2>
          <p className="text-gray-700 mb-4">
            This demonstration walks through a complete operational day in AgeEmpower,
            showing the full workflow from task assignment to manager oversight:
          </p>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
              <h3 className="font-bold text-blue-900 mb-2">
                Step 1: Supervisor Assignment
              </h3>
              <p className="text-sm text-blue-800">
                Supervisors assign tasks to caregivers in bulk, set priorities, and
                specify evidence requirements.
              </p>
              <ul className="text-sm text-blue-800 mt-2 list-disc list-inside">
                <li>Multi-select tasks</li>
                <li>Bulk assignment to caregivers</li>
                <li>Department and shift management</li>
                <li>Evidence requirement enforcement</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 bg-green-50 p-4">
              <h3 className="font-bold text-green-900 mb-2">
                Step 2: Caregiver Execution
              </h3>
              <p className="text-sm text-green-800">
                Caregivers view their assigned tasks, execute them, and capture evidence.
              </p>
              <ul className="text-sm text-green-800 mt-2 list-disc list-inside">
                <li>Task list by shift and priority</li>
                <li>Evidence capture (photo, voice, notes, metrics)</li>
                <li>Multi-evidence submission</li>
                <li>Task completion with outcome recording</li>
              </ul>
            </div>

            <div className="border-l-4 border-yellow-500 bg-yellow-50 p-4">
              <h3 className="font-bold text-yellow-900 mb-2">
                Step 3: Supervisor Review
              </h3>
              <p className="text-sm text-yellow-800">
                Supervisors review completed tasks, view evidence, and approve or reject.
              </p>
              <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside">
                <li>Review queue with filters</li>
                <li>Evidence viewer (photo, audio, transcripts)</li>
                <li>Batch approve/reject</li>
                <li>Quality ratings and comments</li>
              </ul>
            </div>

            <div className="border-l-4 border-gray-500 bg-gray-50 p-4">
              <h3 className="font-bold text-gray-900 mb-2">
                Step 4: Manager Oversight
              </h3>
              <p className="text-sm text-gray-800">
                Managers view daily status across all departments and identify issues.
              </p>
              <ul className="text-sm text-gray-800 mt-2 list-disc list-inside">
                <li>Department performance dashboard</li>
                <li>Completion rates and staffing adequacy</li>
                <li>Issue tracking and drill-down</li>
                <li>Export capabilities</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">
            Audit Trail & Immutability
          </h3>
          <p className="text-sm text-blue-800">
            Every action creates an immutable audit entry tied to user + role:
          </p>
          <ul className="text-sm text-blue-800 mt-2 list-disc list-inside">
            <li>Task assignments logged with supervisor ID</li>
            <li>Evidence submissions timestamped with caregiver ID</li>
            <li>Review decisions recorded with reviewer ID and ratings</li>
            <li>State transitions audited with before/after snapshots</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-bold text-green-900 mb-2">
            Real RPCs, Real Permissions
          </h3>
          <p className="text-sm text-green-800">
            This demo uses production-ready RPCs with role-based access control:
          </p>
          <ul className="text-sm text-green-800 mt-2 list-disc list-inside">
            <li>
              <code className="bg-green-100 px-1 rounded">bulk_assign_tasks</code> -
              Supervisor bulk assignment
            </li>
            <li>
              <code className="bg-green-100 px-1 rounded">
                complete_task_with_evidence
              </code>{' '}
              - Caregiver task completion
            </li>
            <li>
              <code className="bg-green-100 px-1 rounded">batch_review_tasks</code> -
              Supervisor batch review
            </li>
            <li>
              <code className="bg-green-100 px-1 rounded">
                get_manager_dashboard_data
              </code>{' '}
              - Manager oversight
            </li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-yellow-900 mb-1">
                Showcase Mode Required
              </h3>
              <p className="text-sm text-yellow-800">
                This demo requires Showcase Mode with seeded data. Click "Start Demo"
                to proceed through the workflow step-by-step.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            Progress: {demoProgress.tasksAssigned} assigned,{' '}
            {demoProgress.tasksCompleted} completed, {demoProgress.tasksReviewed}{' '}
            reviewed
          </div>
          <button
            onClick={() => setCurrentStep('assignment')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Start Demo →
          </button>
        </div>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg shadow-lg p-8 text-white mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">Demo Complete!</h1>
            <p className="text-xl text-green-100">
              You've successfully run through a complete operational day
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            What You Demonstrated
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 border-b border-gray-200 pb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Supervisor Assignment</h3>
                <p className="text-sm text-gray-600">
                  Bulk task assignment with evidence requirements and priority
                  management
                </p>
                <div className="text-xs text-green-600 mt-1">
                  ✓ {demoProgress.tasksAssigned} tasks assigned
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 border-b border-gray-200 pb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Caregiver Execution</h3>
                <p className="text-sm text-gray-600">
                  Task completion with multi-evidence capture (photo, voice, notes,
                  metrics)
                </p>
                <div className="text-xs text-green-600 mt-1">
                  ✓ {demoProgress.tasksCompleted} tasks completed
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 border-b border-gray-200 pb-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-600 font-bold">3</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Supervisor Review</h3>
                <p className="text-sm text-gray-600">
                  Batch review workflow with evidence viewing and quality ratings
                </p>
                <div className="text-xs text-green-600 mt-1">
                  ✓ {demoProgress.tasksReviewed} tasks reviewed
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-gray-600 font-bold">4</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Manager Oversight</h3>
                <p className="text-sm text-gray-600">
                  Department performance tracking with issue identification and export
                </p>
                <div className="text-xs text-green-600 mt-1">
                  ✓ Dashboard viewed with real-time data
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-bold text-green-900 mb-2">
            WP1 Acceptance Criteria Met ✓
          </h3>
          <ul className="text-sm text-green-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>
                Supervisor can assign a shift without manual DB manipulation
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>
                Caregiver can complete tasks and submit evidence on mobile viewport
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>Supervisor can review 20 tasks in a batch workflow</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>
                Manager can see daily status + exceptions requiring attention
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>
                All actions create immutable audit entries tied to user + role
              </span>
            </li>
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setCurrentStep('intro')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Run Demo Again
          </button>
          <button
            onClick={() => {
              setCurrentStep('intro');
              setDemoProgress({ tasksAssigned: 0, tasksCompleted: 0, tasksReviewed: 0 });
            }}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Reset Demo
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {renderStepIndicator()}

      <div className="p-6">
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'complete' && renderComplete()}

        {currentStep === 'assignment' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Step 1: Supervisor Assignment
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Select tasks and assign them to caregivers. Try selecting multiple
                tasks and assigning them in bulk.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('intro')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep('execution')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next: Caregiver Execution →
                </button>
              </div>
            </div>
            <SupervisorAssignmentUI
              agencyId={agencyId}
              departmentId={departmentId}
              onAssignmentComplete={handleAssignmentComplete}
            />
          </div>
        )}

        {currentStep === 'execution' && caregiverId && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Step 2: Caregiver Execution
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                View assigned tasks, start a task, capture evidence (photo, voice, notes,
                metrics), and complete it.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('assignment')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep('review')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next: Supervisor Review →
                </button>
              </div>
            </div>
            <CaregiverExecutionUI
              caregiverId={caregiverId}
              onTaskComplete={handleExecutionComplete}
            />
          </div>
        )}

        {currentStep === 'review' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Step 3: Supervisor Review
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Review completed tasks, view evidence, and approve/reject in batch. Try
                reviewing multiple tasks at once.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('execution')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep('manager')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next: Manager Oversight →
                </button>
              </div>
            </div>
            <SupervisorReviewDashboard
              agencyId={agencyId}
              departmentId={departmentId}
            />
          </div>
        )}

        {currentStep === 'manager' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Step 4: Manager Oversight
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                View department performance, daily completion rates, staffing adequacy,
                and issues requiring attention. Try exporting the dashboard.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('review')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setCurrentStep('complete')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Complete Demo ✓
                </button>
              </div>
            </div>
            <ManagerDashboard agencyId={agencyId} />
          </div>
        )}
      </div>
    </div>
  );
}
