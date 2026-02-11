import { useState, useEffect } from 'react';
import { useTraining } from '../hooks/useTraining';

export function TrainingPanel() {
  const [modules, setModules] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    getUserTrainingModules,
    startTrainingModule,
    completeTrainingModule,
    dismissTrainingModule,
    getUserTrainingProgress
  } = useTraining();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [modulesData, progressData] = await Promise.all([
        getUserTrainingModules(),
        getUserTrainingProgress()
      ]);
      setModules(modulesData.modules || []);
      setProgress(progressData);
    } catch (err) {
      console.error('Failed to load training data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = async (moduleId: string) => {
    try {
      setMessage(null);
      await startTrainingModule(moduleId);
      setMessage({ type: 'success', text: 'Training module started' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to start module' });
    }
  };

  const handleCompleteModule = async (moduleId: string) => {
    try {
      setMessage(null);
      await completeTrainingModule(moduleId);
      setMessage({ type: 'success', text: 'Training module completed' });
      setSelectedModule(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to complete module' });
    }
  };

  const handleDismissModule = async (moduleId: string) => {
    try {
      setMessage(null);
      await dismissTrainingModule(moduleId);
      setMessage({ type: 'success', text: 'Training module dismissed' });
      setSelectedModule(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to dismiss module' });
    }
  };

  const getModuleTypeBadge = (moduleType: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      FIRST_TIME_WALKTHROUGH: { text: 'Walkthrough', color: 'bg-blue-100 text-blue-800' },
      CONTEXTUAL_TUTORIAL: { text: 'Tutorial', color: 'bg-green-100 text-green-800' },
      TASK_BASED: { text: 'Task-Based', color: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[moduleType] || { text: moduleType, color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading training modules...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Training & Guidance</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {progress && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="text-sm text-blue-600 font-semibold">Total Progress</div>
            <div className="text-2xl font-bold text-blue-800 mt-1">
              {Math.round(progress.completion_percentage)}%
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {progress.completed_modules} of {progress.total_modules} completed
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <div className="text-sm text-red-600 font-semibold">Mandatory Training</div>
            <div className="text-2xl font-bold text-red-800 mt-1">
              {Math.round(progress.mandatory_completion_percentage)}%
            </div>
            <div className="text-xs text-red-600 mt-1">
              {progress.mandatory_completed} of {progress.mandatory_total} completed
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="text-sm text-green-600 font-semibold">Optional Training</div>
            <div className="text-2xl font-bold text-green-800 mt-1">
              {progress.total_modules - progress.mandatory_total}
            </div>
            <div className="text-xs text-green-600 mt-1">Available modules</div>
          </div>
        </div>
      )}

      {modules.length === 0 ? (
        <div className="text-gray-600 text-center py-8">No training modules available</div>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module.id}
              className={`border rounded-lg p-4 ${
                module.progress?.is_completed
                  ? 'bg-green-50 border-green-200'
                  : module.is_mandatory
                  ? 'bg-red-50 border-red-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{module.title}</h3>
                    {getModuleTypeBadge(module.module_type)}
                    {module.is_mandatory && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">
                        Required by Policy
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{module.description}</p>

                  {module.progress && (
                    <div className="text-xs text-gray-600 space-y-1">
                      {module.progress.started_at && (
                        <div>Started: {new Date(module.progress.started_at).toLocaleString()}</div>
                      )}
                      {module.progress.completed_at && (
                        <div>Completed: {new Date(module.progress.completed_at).toLocaleString()}</div>
                      )}
                      {module.progress.dismissed_at && (
                        <div>Dismissed: {new Date(module.progress.dismissed_at).toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!module.progress?.is_completed && (
                    <>
                      <button
                        onClick={() => setSelectedModule(module)}
                        className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                      >
                        {module.progress?.started_at ? 'Continue' : 'Start'}
                      </button>
                      {module.is_dismissible && !module.progress?.dismissed_at && (
                        <button
                          onClick={() => handleDismissModule(module.id)}
                          className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400"
                        >
                          Dismiss
                        </button>
                      )}
                    </>
                  )}
                  {module.progress?.is_completed && module.is_repeatable && (
                    <button
                      onClick={() => handleStartModule(module.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                    >
                      Retake
                    </button>
                  )}
                  {module.progress?.is_completed && (
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded font-bold">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{selectedModule.title}</h3>
            <div className="text-sm text-gray-700 mb-6">{selectedModule.description}</div>

            <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
              <p className="text-sm text-gray-700">
                Training content would be displayed here based on the module's content structure.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedModule(null)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400"
              >
                Close
              </button>
              <button
                onClick={() => handleCompleteModule(selectedModule.id)}
                className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
        <p className="text-sm text-blue-800 font-semibold">Training Requirements:</p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• Non-blocking: Training never prevents work</li>
          <li>• Dismissible: Optional modules can be dismissed</li>
          <li>• Repeatable: All modules can be retaken</li>
          <li>• Role-specific: Targeted guidance for your role</li>
        </ul>
      </div>
    </div>
  );
}
