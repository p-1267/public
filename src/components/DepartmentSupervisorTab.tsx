import React from 'react';
import { Department } from '../hooks/useDepartments';
import { SupervisorDailyDeliveryPlan } from './SupervisorDailyDeliveryPlan';

interface DepartmentSupervisorTabProps {
  department: Department;
}

export const DepartmentSupervisorTab: React.FC<DepartmentSupervisorTabProps> = ({ department }) => {
  if (!department.supervisor_id || !department.supervisor_name) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
        <div className="text-6xl mb-4">👤</div>
        <div className="text-2xl font-bold text-slate-900 mb-2">No Supervisor Assigned</div>
        <div className="text-lg text-slate-600 mb-6">
          This department does not have a supervisor assigned yet
        </div>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
          Assign Supervisor
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Supervisor Profile</h2>
            <p className="text-slate-600">Current department supervisor details</p>
          </div>
          <button className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold">
            Edit Supervisor
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Full Name</label>
              <div className="text-lg font-semibold text-slate-900">{department.supervisor_name}</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Employee ID</label>
              <div className="text-lg text-slate-900">SUP-{department.supervisor_id.slice(0, 8).toUpperCase()}</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Role / Title</label>
              <div className="text-lg text-slate-900">{department.name} Supervisor</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Department</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{department.icon}</span>
                <span className="text-lg text-slate-900">{department.name}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Default Shift Pattern</label>
              <div className="text-lg text-slate-900">Day Shift (07:00 - 15:00)</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Work Phone</label>
              <div className="text-lg text-slate-900">555-0100</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Work Email</label>
              <div className="text-lg text-slate-900">supervisor@demo.com</div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Current Status</label>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full border border-green-300">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span className="font-semibold">On Shift</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <h3 className="font-bold text-slate-900 mb-3">Credentials & Permissions</h3>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold border border-blue-300">
              Department Supervisor
            </div>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold border border-blue-300">
              Assignment Management
            </div>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold border border-blue-300">
              Staff Scheduling
            </div>
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold border border-blue-300">
              Task Review
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            View Schedule
          </button>
          <button className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold">
            Replace Supervisor
          </button>
        </div>
      </div>

      <SupervisorDailyDeliveryPlan departmentId={department.id} departmentName={department.name} />
    </div>
  );
};
