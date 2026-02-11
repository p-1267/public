import React, { useState } from 'react';
import { useDepartmentPersonnel } from '../hooks/useDepartments';

interface DepartmentPersonnelTabProps {
  departmentId: string;
}

const STATUS_COLORS = {
  on_shift: 'bg-green-100 text-green-800 border-green-300',
  off_shift: 'bg-slate-100 text-slate-600 border-slate-300',
  on_break: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  on_call: 'bg-blue-100 text-blue-800 border-blue-300'
};

const STATUS_LABELS = {
  on_shift: 'On Shift',
  off_shift: 'Off Shift',
  on_break: 'On Break',
  on_call: 'On Call'
};

export const DepartmentPersonnelTab: React.FC<DepartmentPersonnelTabProps> = ({ departmentId }) => {
  const { personnel, loading, error } = useDepartmentPersonnel(departmentId);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch =
      person.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.position_title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || person.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-slate-600">Loading personnel...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
        <div className="text-red-900 font-bold mb-2">Error Loading Personnel</div>
        <div className="text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex gap-3">
          <input
            type="text"
            placeholder="Search by name, employee ID, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="on_shift">On Shift</option>
            <option value="off_shift">Off Shift</option>
            <option value="on_break">On Break</option>
            <option value="on_call">On Call</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold whitespace-nowrap">
          + Add Personnel
        </button>
      </div>

      {filteredPersonnel.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <div className="text-2xl font-bold text-slate-900 mb-2">
            {personnel.length === 0 ? 'No Personnel' : 'No Matching Personnel'}
          </div>
          <div className="text-lg text-slate-600">
            {personnel.length === 0
              ? 'No staff members assigned to this department yet'
              : 'Try adjusting your search or filters'}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Shift Pattern
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Workload
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredPersonnel.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{person.display_name}</div>
                      {person.first_name && person.last_name && (
                        <div className="text-sm text-slate-600">{person.first_name} {person.last_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-slate-900">{person.employee_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{person.position_title}</div>
                      {person.is_primary_department && (
                        <div className="text-xs text-blue-600 font-semibold">Primary Dept</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 capitalize">{person.shift_pattern}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{person.work_phone}</div>
                      <div className="text-xs text-slate-600">{person.work_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[person.status as keyof typeof STATUS_COLORS]}`}>
                        {STATUS_LABELS[person.status as keyof typeof STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{person.workload_indicator}</span>
                        <span className="text-xs text-slate-600">tasks</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 font-semibold">
                          View
                        </button>
                        <button className="text-slate-600 hover:text-slate-800 font-semibold">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredPersonnel.length > 0 && (
        <div className="text-sm text-slate-600">
          Showing {filteredPersonnel.length} of {personnel.length} personnel
        </div>
      )}
    </div>
  );
};
