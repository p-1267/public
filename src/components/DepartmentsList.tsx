import React from 'react';
import { useDepartments } from '../hooks/useDepartments';

interface DepartmentsListProps {
  onSelectDepartment: (departmentId: string) => void;
}

const STATUS_COLORS = {
  normal: 'bg-green-100 text-green-800 border-green-300',
  understaffed: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  alerts: 'bg-red-100 text-red-800 border-red-300'
};

const STATUS_LABELS = {
  normal: 'Normal',
  understaffed: 'Understaffed',
  alerts: 'Alerts'
};

export const DepartmentsList: React.FC<DepartmentsListProps> = ({ onSelectDepartment }) => {
  const { departments, loading, error } = useDepartments();

  console.log('[DepartmentsList] Rendering:', {
    departmentsCount: departments.length,
    loading,
    error
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-slate-600">Loading departments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
        <div className="text-red-900 font-bold mb-2">Error Loading Departments</div>
        <div className="text-red-700">{error}</div>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
        <div className="text-6xl mb-4">📋</div>
        <div className="text-2xl font-bold text-slate-900 mb-2">No Departments</div>
        <div className="text-lg text-slate-600">No departments have been set up yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Departments</h1>
        <p className="text-lg text-slate-600">
          Select a department to view details, manage personnel, and assign tasks
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => onSelectDepartment(dept.id)}
            className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">{dept.icon}</div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[dept.status]}`}>
                {STATUS_LABELS[dept.status]}
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">{dept.name}</h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-semibold">Staff:</span>
                <span>{dept.staff_count} {dept.staff_count === 1 ? 'person' : 'people'}</span>
              </div>

              {dept.supervisor_name && (
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-semibold">Supervisor:</span>
                  <span className="truncate">{dept.supervisor_name}</span>
                </div>
              )}

              {!dept.supervisor_name && (
                <div className="text-slate-500 italic">No supervisor assigned</div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">{dept.description}</div>
            </div>

            <div className="mt-4 text-blue-600 font-semibold text-sm flex items-center gap-1">
              View Details
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
