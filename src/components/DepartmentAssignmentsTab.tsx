import React, { useState } from 'react';
import { useDepartmentAssignments } from '../hooks/useDepartments';
import { AssignmentForm } from './AssignmentForm';

interface DepartmentAssignmentsTabProps {
  departmentId: string;
}

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700 border-slate-300',
  medium: 'bg-blue-100 text-blue-800 border-blue-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  urgent: 'bg-red-100 text-red-800 border-red-300'
};

const STATUS_COLORS = {
  not_started: 'bg-slate-100 text-slate-700 border-slate-300',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
  blocked: 'bg-red-100 text-red-800 border-red-300',
  completed: 'bg-green-100 text-green-800 border-green-300'
};

const ACCEPTANCE_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  acknowledged: 'bg-blue-100 text-blue-800 border-blue-300',
  accepted: 'bg-green-100 text-green-800 border-green-300',
  declined: 'bg-red-100 text-red-800 border-red-300'
};

export const DepartmentAssignmentsTab: React.FC<DepartmentAssignmentsTabProps> = ({ departmentId }) => {
  const { assignments, loading, error } = useDepartmentAssignments(departmentId);
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredAssignments = assignments.filter(assignment => {
    const matchesPriority = filterPriority === 'all' || assignment.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    return matchesPriority && matchesStatus;
  });

  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-slate-600">Loading assignments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
        <div className="text-red-900 font-bold mb-2">Error Loading Assignments</div>
        <div className="text-red-700">{error}</div>
      </div>
    );
  }

  if (showForm) {
    return (
      <AssignmentForm
        departmentId={departmentId}
        onClose={() => setShowForm(false)}
        onSave={() => {
          setShowForm(false);
        }}
      />
    );
  }

  if (selectedAssignment && selectedAssignmentData) {
    const checklist = Array.isArray(selectedAssignmentData.checklist_tasks)
      ? selectedAssignmentData.checklist_tasks
      : [];
    const completedTasks = checklist.filter((t: any) => t.completed).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedAssignment(null)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Assignments
          </button>
        </div>

        <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedAssignmentData.title}</h2>
              <p className="text-slate-600">{selectedAssignmentData.description}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${PRIORITY_COLORS[selectedAssignmentData.priority]}`}>
                {selectedAssignmentData.priority.toUpperCase()}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[selectedAssignmentData.status]}`}>
                {selectedAssignmentData.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Assigned To</label>
              <div className="text-lg font-semibold text-slate-900">{selectedAssignmentData.assigned_to_name || 'Unassigned'}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Created By</label>
              <div className="text-lg text-slate-900">{selectedAssignmentData.created_by_name || 'System'}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Shift</label>
              <div className="text-lg text-slate-900 capitalize">{selectedAssignmentData.shift_type} Shift</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Time Window</label>
              <div className="text-lg text-slate-900">
                {new Date(selectedAssignmentData.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                {new Date(selectedAssignmentData.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {selectedAssignmentData.location_area && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Location</label>
                <div className="text-lg text-slate-900">{selectedAssignmentData.location_area}</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Acceptance</label>
              <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full border ${ACCEPTANCE_COLORS[selectedAssignmentData.acceptance_state]}`}>
                {selectedAssignmentData.acceptance_state.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Task Checklist</h3>
              <div className="text-sm font-semibold text-slate-600">
                {completedTasks} / {checklist.length} completed
              </div>
            </div>

            {checklist.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No tasks in checklist</div>
            ) : (
              <div className="space-y-2">
                {checklist.map((task: any, index: number) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                      task.completed ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed || false}
                      readOnly
                      className="mt-1 w-5 h-5 rounded border-slate-300"
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {task.task}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(selectedAssignmentData.notes || selectedAssignmentData.handoff_notes) && (
            <div className="border-t border-slate-200 pt-6 mt-6 space-y-4">
              {selectedAssignmentData.notes && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Notes</label>
                  <div className="p-3 bg-slate-50 rounded-lg text-slate-900">{selectedAssignmentData.notes}</div>
                </div>
              )}
              {selectedAssignmentData.handoff_notes && (
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Handoff Notes</label>
                  <div className="p-3 bg-blue-50 rounded-lg text-slate-900">{selectedAssignmentData.handoff_notes}</div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              Edit Assignment
            </button>
            <button className="px-4 py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold">
              Reassign
            </button>
            <button className="px-4 py-2 border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-semibold ml-auto">
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold whitespace-nowrap"
        >
          + Create Assignment
        </button>
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <div className="text-2xl font-bold text-slate-900 mb-2">
            {assignments.length === 0 ? 'No Assignments' : 'No Matching Assignments'}
          </div>
          <div className="text-lg text-slate-600 mb-6">
            {assignments.length === 0
              ? 'No assignments created for this department yet'
              : 'Try adjusting your filters'}
          </div>
          {assignments.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Create First Assignment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => {
            const checklist = Array.isArray(assignment.checklist_tasks) ? assignment.checklist_tasks : [];
            const completedTasks = checklist.filter((t: any) => t.completed).length;

            return (
              <div
                key={assignment.id}
                onClick={() => setSelectedAssignment(assignment.id)}
                className="bg-white rounded-xl border-2 border-slate-200 p-4 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{assignment.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{assignment.description}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full border ${PRIORITY_COLORS[assignment.priority]}`}>
                      {assignment.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[assignment.status]}`}>
                      {assignment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-slate-600 font-semibold">Assigned To</div>
                    <div className="text-slate-900 font-medium">{assignment.assigned_to_name || 'Unassigned'}</div>
                  </div>
                  <div>
                    <div className="text-slate-600 font-semibold">Shift</div>
                    <div className="text-slate-900 capitalize">{assignment.shift_type}</div>
                  </div>
                  <div>
                    <div className="text-slate-600 font-semibold">Time</div>
                    <div className="text-slate-900">
                      {new Date(assignment.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-600 font-semibold">Tasks</div>
                    <div className="text-slate-900">
                      {completedTasks} / {checklist.length} completed
                    </div>
                  </div>
                </div>

                {assignment.location_area && (
                  <div className="mt-3 pt-3 border-t border-slate-200 text-sm">
                    <span className="text-slate-600 font-semibold">Location: </span>
                    <span className="text-slate-900">{assignment.location_area}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filteredAssignments.length > 0 && (
        <div className="text-sm text-slate-600">
          Showing {filteredAssignments.length} of {assignments.length} assignments
        </div>
      )}
    </div>
  );
};
