import { useState, useEffect } from 'react';
import { useTraining } from '../hooks/useTraining';

interface TrainingProgress {
  total_modules: number;
  completed_modules: number;
  completion_percentage: number;
  mandatory_total: number;
  mandatory_completed: number;
  mandatory_percentage: number;
}

export function TrainingProgressDashboard({ userId }: { userId?: string }) {
  const { modules, loading: modulesLoading } = useTraining();
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [userId]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const mandatory = modules.filter(m => m.is_mandatory);
      const completed = modules.filter(m => m.user_progress?.status === 'COMPLETED');
      const mandatoryCompleted = mandatory.filter(m => m.user_progress?.status === 'COMPLETED');

      setProgress({
        total_modules: modules.length,
        completed_modules: completed.length,
        completion_percentage: modules.length > 0 ? Math.round((completed.length / modules.length) * 100) : 0,
        mandatory_total: mandatory.length,
        mandatory_completed: mandatoryCompleted.length,
        mandatory_percentage: mandatory.length > 0 ? Math.round((mandatoryCompleted.length / mandatory.length) * 100) : 0
      });
    } catch (err) {
      console.error('Failed to calculate progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || modulesLoading) {
    return <div className="text-gray-600">Loading training progress...</div>;
  }

  if (!progress) {
    return <div className="text-gray-600">No training data available</div>;
  }

  const isMandatoryComplete = progress.mandatory_percentage === 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Training Progress</h2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className={`border-2 rounded-lg p-6 ${
          isMandatoryComplete
            ? 'bg-green-50 border-green-300'
            : 'bg-yellow-50 border-yellow-300'
        }`}>
          <div className={`text-sm font-semibold mb-2 ${
            isMandatoryComplete ? 'text-green-600' : 'text-yellow-600'
          }`}>
            Mandatory Training
          </div>
          <div className="flex items-end gap-2">
            <div className={`text-4xl font-bold ${
              isMandatoryComplete ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {progress.mandatory_percentage}%
            </div>
            <div className="text-sm text-gray-600 mb-1">
              ({progress.mandatory_completed} of {progress.mandatory_total})
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${isMandatoryComplete ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${progress.mandatory_percentage}%` }}
            />
          </div>
          {!isMandatoryComplete && (
            <div className="mt-3 text-sm font-semibold text-yellow-800">
              ⚠ Complete to unlock full system access
            </div>
          )}
        </div>

        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
          <div className="text-sm text-blue-600 font-semibold mb-2">
            Overall Progress
          </div>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-bold text-blue-900">
              {progress.completion_percentage}%
            </div>
            <div className="text-sm text-gray-600 mb-1">
              ({progress.completed_modules} of {progress.total_modules})
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${progress.completion_percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="text-sm font-semibold">Training Modules</div>
        </div>
        <div className="divide-y divide-gray-200">
          {modules.map((module) => {
            const status = module.user_progress?.status || 'NOT_STARTED';
            const isCompleted = status === 'COMPLETED';
            const isInProgress = status === 'IN_PROGRESS';

            return (
              <div key={module.id} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-100 text-green-600' :
                      isInProgress ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? '✓' : isInProgress ? '◐' : '○'}
                    </div>
                    <div>
                      <div className="font-semibold">{module.title}</div>
                      {module.is_mandatory && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          MANDATORY
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {isCompleted && module.user_progress?.completed_at && (
                      <span>Completed {new Date(module.user_progress.completed_at).toLocaleDateString()}</span>
                    )}
                    {isInProgress && (
                      <span className="text-blue-600 font-semibold">In Progress</span>
                    )}
                    {!isCompleted && !isInProgress && (
                      <span className="text-gray-400">Not Started</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isMandatoryComplete && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded p-4">
          <div className="text-sm font-bold text-red-900 mb-2">Action Required:</div>
          <div className="text-sm text-red-800">
            Complete all mandatory training modules to unlock full system access. Some features may be restricted until training is complete.
          </div>
        </div>
      )}
    </div>
  );
}
