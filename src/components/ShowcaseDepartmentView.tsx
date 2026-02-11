import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

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
  MONITORING: 'bg-purple-100 border-purple-300 text-purple-900'
};

export const ShowcaseDepartmentView: React.FC = () => {
  const { mockAgencyId } = useShowcase();
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-6 space-y-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Department Overview</h1>
        <p className="text-lg text-slate-600">
          Task status across all departments
        </p>
      </header>

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

      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mt-8">
        <div className="flex items-start gap-4">
          <div className="text-3xl">ℹ️</div>
          <div>
            <h3 className="font-bold text-blue-900 text-lg mb-2">Department Structure</h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              Each department manages specific types of care tasks. NURSING handles medications and vitals,
              HOUSEKEEPING manages room cleaning and hygiene, and KITCHEN coordinates meal preparation and delivery.
              Staff are assigned to departments based on their roles and certifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
