import React, { useState } from 'react';
import { useDepartments } from '../hooks/useDepartments';
import { DepartmentSupervisorTab } from './DepartmentSupervisorTab';
import { DepartmentPersonnelTab } from './DepartmentPersonnelTab';
import { DepartmentAssignmentsTab } from './DepartmentAssignmentsTab';
import { DepartmentScheduleTab } from './DepartmentScheduleTab';

interface DepartmentDetailProps {
  departmentId: string;
  onBack: () => void;
}

type TabType = 'supervisor' | 'personnel' | 'assignments' | 'schedule';

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

export const DepartmentDetail: React.FC<DepartmentDetailProps> = ({ departmentId, onBack }) => {
  const { departments, loading } = useDepartments();
  const [activeTab, setActiveTab] = useState<TabType>('supervisor');

  const department = departments.find(d => d.id === departmentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-slate-600">Loading department details...</div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
        <div className="text-yellow-900 font-bold mb-2">Department Not Found</div>
        <button onClick={onBack} className="text-blue-600 hover:text-blue-800 font-semibold">
          ← Back to Departments
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Back to departments"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="text-5xl">{department.icon}</div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{department.name}</h1>
              <p className="text-slate-600">{department.description}</p>
            </div>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-lg text-sm font-bold border ${STATUS_COLORS[department.status]}`}>
          {STATUS_LABELS[department.status]}
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-200 p-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900">{department.staff_count}</div>
          <div className="text-sm text-slate-600">Staff Members</div>
        </div>
        <div className="text-center border-l border-slate-200">
          <div className="text-lg font-bold text-slate-900">
            {department.supervisor_name || 'None'}
          </div>
          <div className="text-sm text-slate-600">Supervisor</div>
        </div>
        <div className="text-center border-l border-slate-200">
          <div className="text-lg font-bold text-slate-900">{department.department_code}</div>
          <div className="text-sm text-slate-600">Department Code</div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('supervisor')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'supervisor'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Supervisor
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'personnel'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Personnel
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'assignments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Assignments
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Schedule
          </button>
        </nav>
      </div>

      <div className="min-h-96">
        {activeTab === 'supervisor' && <DepartmentSupervisorTab department={department} />}
        {activeTab === 'personnel' && <DepartmentPersonnelTab departmentId={department.id} />}
        {activeTab === 'assignments' && <DepartmentAssignmentsTab departmentId={department.id} />}
        {activeTab === 'schedule' && <DepartmentScheduleTab departmentId={department.id} />}
      </div>
    </div>
  );
};
