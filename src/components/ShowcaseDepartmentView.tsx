import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DepartmentStats {
  department: string;
  total_tasks: number;
  completed_tasks: number;
  scheduled_tasks: number;
  pending_acknowledgement: number;
}

const DEPARTMENT_ICONS: Record<string, string> = {
  NURSING: '💊',
  HOUSEKEEPING: '🧹',
  KITCHEN: '🍽️',
  HYGIENE: '🚿',
  MOBILITY: '🚶',
  NUTRITION: '🥗',
  MONITORING: '📊'
};

const DEPARTMENT_COLORS: Record<string, string> = {
  NURSING: 'bg-blue-100 border-blue-300 text-blue-900',
  HOUSEKEEPING: 'bg-teal-100 border-teal-300 text-teal-900',
  KITCHEN: 'bg-orange-100 border-orange-300 text-orange-900',
  HYGIENE: 'bg-cyan-100 border-cyan-300 text-cyan-900',
  MOBILITY: 'bg-green-100 border-green-300 text-green-900',
  NUTRITION: 'bg-lime-100 border-lime-300 text-lime-900',
  MONITORING: 'bg-slate-100 border-slate-300 text-slate-900'
};

export const ShowcaseDepartmentView: React.FC = () => {
  const { mockAgencyId, currentScenario } = useShowcase();
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (mockAgencyId) {
      loadDepartmentStats();
    }
  }, [mockAgencyId]);

  const loadDepartmentStats = async () => {
    if (!mockAgencyId) return;

    try {
      const { data, error } = await supabase.rpc('get_department_stats', {
        p_agency_id: mockAgencyId
      });

      if (error) throw error;

      setDepartmentStats(data || []);
      console.log('[ShowcaseDepartmentView] Loaded department stats:', data);
    } catch (error) {
      console.error('Failed to load department stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-slate-600">Loading departments...</div>
      </div>
    );
  }

  if (departmentStats.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
        <div className="text-6xl mb-4">📋</div>
        <div className="text-2xl font-bold text-slate-900 mb-2">No Department Data</div>
        <div className="text-lg text-slate-600">No departments have been set up yet</div>
      </div>
    );
  }

  const scenarioName = currentScenario?.name || 'Scenario Active';
  const totalTasks = departmentStats.reduce((sum, d) => sum + d.total_tasks, 0);
  const completedTasks = departmentStats.reduce((sum, d) => sum + d.completed_tasks, 0);
  const needsReview = departmentStats.reduce((sum, d) => sum + d.pending_acknowledgement, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Department Overview</h2>
            <div className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700">
              {scenarioName}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-sm transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand Details
              </>
            )}
          </button>
        </div>

        {!isExpanded && (
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-slate-600">Total Tasks: </span>
              <span className="font-bold text-slate-900">{totalTasks}</span>
            </div>
            <div>
              <span className="text-slate-600">Completed: </span>
              <span className="font-bold text-green-700">{completedTasks}</span>
            </div>
            {needsReview > 0 && (
              <div>
                <span className="text-slate-600">Needs Review: </span>
                <span className="font-bold text-red-700">{needsReview}</span>
              </div>
            )}
            <div>
              <span className="text-slate-600">Departments: </span>
              <span className="font-bold text-slate-900">{departmentStats.length}</span>
            </div>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {departmentStats.map((dept) => (
          <div
            key={dept.department}
            className={`p-6 rounded-xl border-2 ${
              DEPARTMENT_COLORS[dept.department] || 'bg-gray-100 border-gray-300 text-gray-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">{DEPARTMENT_ICONS[dept.department] || '📁'}</div>
              <div className="text-2xl font-bold">{dept.total_tasks}</div>
            </div>

            <h3 className="text-xl font-bold mb-3">{dept.department}</h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Completed:</span>
                <span className="font-bold">{dept.completed_tasks}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Scheduled:</span>
                <span className="font-bold">{dept.scheduled_tasks}</span>
              </div>
              {dept.pending_acknowledgement > 0 && (
                <div className="flex justify-between text-sm mt-3 pt-3 border-t border-current">
                  <span className="font-medium">Needs Review:</span>
                  <span className="font-bold text-red-600">{dept.pending_acknowledgement}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-current">
              <div className="text-xs font-medium">
                {Math.round((dept.completed_tasks / dept.total_tasks) * 100)}% Complete
              </div>
              <div className="mt-2 h-2 bg-white bg-opacity-40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-current transition-all duration-500"
                  style={{
                    width: `${(dept.completed_tasks / dept.total_tasks) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">Department Structure</h3>
                <p className="text-slate-700 text-xs leading-relaxed">
                  Each department manages specific types of care tasks. NURSING handles medications and vitals,
                  HOUSEKEEPING manages room cleaning and hygiene, and KITCHEN coordinates meal preparation and delivery.
                  Staff are assigned to departments based on their roles and certifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
