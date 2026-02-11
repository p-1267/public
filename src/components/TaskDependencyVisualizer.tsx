import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TaskDependency {
  task_id: string;
  task_name: string;
  depends_on_task_id: string;
  depends_on_task_name: string;
  clinical_reasoning: string;
  can_override: boolean;
  override_conditions: string[];
}

export function TaskDependencyVisualizer({ taskId }: { taskId: string }) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [reverseDeps, setReverseDeps] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDependencies();
  }, [taskId]);

  const loadDependencies = async () => {
    setLoading(true);
    try {
      const [forwardResult, reverseResult] = await Promise.all([
        supabase
          .from('task_dependencies')
          .select(`
            task_id,
            depends_on_task_id,
            clinical_reasoning,
            can_override,
            override_conditions,
            task:core_tasks!task_dependencies_task_id_fkey(task_name),
            depends_on:core_tasks!task_dependencies_depends_on_task_id_fkey(task_name)
          `)
          .eq('task_id', taskId),
        supabase
          .from('task_dependencies')
          .select(`
            task_id,
            depends_on_task_id,
            clinical_reasoning,
            can_override,
            override_conditions,
            task:core_tasks!task_dependencies_task_id_fkey(task_name),
            depends_on:core_tasks!task_dependencies_depends_on_task_id_fkey(task_name)
          `)
          .eq('depends_on_task_id', taskId)
      ]);

      if (forwardResult.data) {
        setDependencies(forwardResult.data.map((d: any) => ({
          task_id: d.task_id,
          task_name: d.task?.task_name || 'Unknown Task',
          depends_on_task_id: d.depends_on_task_id,
          depends_on_task_name: d.depends_on?.task_name || 'Unknown Task',
          clinical_reasoning: d.clinical_reasoning || 'No reasoning provided',
          can_override: d.can_override || false,
          override_conditions: d.override_conditions || []
        })));
      }

      if (reverseResult.data) {
        setReverseDeps(reverseResult.data.map((d: any) => ({
          task_id: d.task_id,
          task_name: d.task?.task_name || 'Unknown Task',
          depends_on_task_id: d.depends_on_task_id,
          depends_on_task_name: d.depends_on?.task_name || 'Unknown Task',
          clinical_reasoning: d.clinical_reasoning || 'No reasoning provided',
          can_override: d.can_override || false,
          override_conditions: d.override_conditions || []
        })));
      }
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading dependency chain...</div>;
  }

  if (dependencies.length === 0 && reverseDeps.length === 0) {
    return (
      <div className="bg-green-50 border border-green-300 rounded p-4">
        <div className="text-green-900 font-semibold">✓ No Dependencies</div>
        <div className="text-sm text-green-700 mt-1">This task can be started immediately</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Task Dependency Chain</h3>

      {dependencies.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="text-lg font-bold text-red-900 mb-3">⚠ Must Complete First:</div>
          <div className="space-y-3">
            {dependencies.map((dep, idx) => (
              <div key={idx} className="bg-white rounded p-3 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔒</span>
                  <span className="font-bold text-red-900">{dep.depends_on_task_name}</span>
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Clinical Reasoning:</span>
                  <div className="mt-1 bg-blue-50 p-2 rounded">{dep.clinical_reasoning}</div>
                </div>
                {dep.can_override && (
                  <div className="text-sm bg-yellow-50 border border-yellow-200 rounded p-2">
                    <div className="font-semibold text-yellow-900 mb-1">Override Allowed If:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {dep.override_conditions.map((cond, cidx) => (
                        <li key={cidx} className="text-yellow-800">{cond}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reverseDeps.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="text-lg font-bold text-blue-900 mb-3">📋 Tasks Waiting On This:</div>
          <div className="space-y-3">
            {reverseDeps.map((dep, idx) => (
              <div key={idx} className="bg-white rounded p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⏸</span>
                  <span className="font-bold text-blue-900">{dep.task_name}</span>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">Clinical Reasoning:</span>
                  <div className="mt-1 bg-blue-50 p-2 rounded">{dep.clinical_reasoning}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-blue-800 font-semibold">
            ℹ Completing this task will unblock {reverseDeps.length} downstream task{reverseDeps.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-700">
        <div className="font-bold mb-1">Why Dependencies Exist:</div>
        Dependencies ensure clinical safety by enforcing proper care sequences. For example:
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Vital signs must be checked before medication administration</li>
          <li>Allergy verification must occur before meal service</li>
          <li>Safety assessment must precede mobility assistance</li>
        </ul>
      </div>
    </div>
  );
}
