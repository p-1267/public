import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  task_name: string;
  resident_name: string;
  priority: string;
  risk_level: string;
  scheduled_start: string;
  requires_evidence: boolean;
  state: string;
}

interface Caregiver {
  id: string;
  display_name: string;
  role: string;
  department_id: string;
}

interface Department {
  id: string;
  name: string;
  department_code: string;
}

interface SupervisorAssignmentUIProps {
  agencyId: string;
  departmentId?: string;
  onAssignmentComplete?: () => void;
}

export function SupervisorAssignmentUI({
  agencyId,
  departmentId,
  onAssignmentComplete,
}: SupervisorAssignmentUIProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedCaregiver, setSelectedCaregiver] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    departmentId || ''
  );
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('unassigned');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [agencyId, selectedDepartment, filterPriority, filterState]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTasks(), loadCaregivers(), loadDepartments()]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadTasks = async () => {
    let query = supabase
      .from('tasks')
      .select(
        `
        id,
        task_name,
        priority,
        risk_level,
        scheduled_start,
        requires_evidence,
        state,
        residents!inner(full_name)
      `
      )
      .eq('agency_id', agencyId)
      .gte('scheduled_start', new Date().toISOString());

    if (selectedDepartment) {
      query = query.eq('department_id', selectedDepartment);
    }

    if (filterPriority !== 'all') {
      query = query.eq('priority', filterPriority);
    }

    if (filterState === 'unassigned') {
      query = query.is('owner_user_id', null);
    } else if (filterState !== 'all') {
      query = query.eq('state', filterState);
    }

    const { data, error } = await query
      .order('scheduled_start', { ascending: true })
      .limit(100);

    if (error) throw error;

    const formattedTasks = (data || []).map((t: any) => ({
      id: t.id,
      task_name: t.task_name,
      resident_name: t.residents.full_name,
      priority: t.priority,
      risk_level: t.risk_level,
      scheduled_start: t.scheduled_start,
      requires_evidence: t.requires_evidence,
      state: t.state,
    }));

    setTasks(formattedTasks);
  };

  const loadCaregivers = async () => {
    let query = supabase
      .from('user_profiles')
      .select('id, display_name, roles(name), department_id')
      .eq('agency_id', agencyId)
      .in('roles.name', ['CAREGIVER', 'NURSE']);

    if (selectedDepartment) {
      query = query.eq('department_id', selectedDepartment);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formattedCaregivers = (data || []).map((c: any) => ({
      id: c.id,
      display_name: c.display_name,
      role: c.roles?.name || 'CAREGIVER',
      department_id: c.department_id,
    }));

    setCaregivers(formattedCaregivers);
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, department_code')
      .eq('agency_id', agencyId)
      .eq('status', 'active')
      .order('name');

    if (error) throw error;
    setDepartments(data || []);
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const selectAll = () => {
    setSelectedTasks(new Set(tasks.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
  };

  const handleBulkAssign = async () => {
    if (selectedTasks.size === 0) {
      setMessage({ type: 'error', text: 'No tasks selected' });
      return;
    }

    if (!selectedCaregiver) {
      setMessage({ type: 'error', text: 'No caregiver selected' });
      return;
    }

    setAssigning(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('bulk_assign_tasks', {
        p_task_ids: Array.from(selectedTasks),
        p_caregiver_id: selectedCaregiver,
        p_department_id: selectedDepartment || null,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        assigned_count: number;
        total_count: number;
        errors: any[];
      };

      if (result.success && result.errors.length === 0) {
        setMessage({
          type: 'success',
          text: `Successfully assigned ${result.assigned_count} task(s)`,
        });
        setSelectedTasks(new Set());
        loadTasks();
        if (onAssignmentComplete) onAssignmentComplete();
      } else {
        setMessage({
          type: 'error',
          text: `Assigned ${result.assigned_count}/${result.total_count} tasks. ${result.errors.length} errors.`,
        });
      }
    } catch (error) {
      console.error('Error assigning tasks:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to assign tasks',
      });
    }

    setAssigning(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-blue-100 text-blue-800 border-blue-300',
      low: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityBadge = (priority: string) => {
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
          priority
        )}`}
      >
        {priority.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading assignment data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Task Assignment
        </h2>
        <p className="text-sm text-gray-600">
          Select tasks and assign to caregivers in bulk
        </p>
      </div>

      {message && (
        <div
          className={`mx-6 mt-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.department_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority Filter
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unassigned">Unassigned</option>
              <option value="all">All States</option>
              <option value="scheduled">Scheduled</option>
              <option value="due">Due</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <select
              value={selectedCaregiver}
              onChange={(e) => setSelectedCaregiver(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Caregiver</option>
              {caregivers.map((cg) => (
                <option key={cg.id} value={cg.id}>
                  {cg.display_name} ({cg.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Select All ({tasks.length})
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear Selection
            </button>
            <span className="text-sm text-gray-600">
              {selectedTasks.size} selected
            </span>
          </div>

          <button
            onClick={handleBulkAssign}
            disabled={assigning || selectedTasks.size === 0 || !selectedCaregiver}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {assigning ? 'Assigning...' : 'Assign Selected Tasks'}
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        tasks.length > 0 && selectedTasks.size === tasks.length
                      }
                      onChange={() =>
                        selectedTasks.size === tasks.length
                          ? clearSelection()
                          : selectAll()
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Task Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Resident
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Scheduled
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No tasks found matching filters
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`hover:bg-gray-50 ${
                        selectedTasks.has(task.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {task.task_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {task.resident_name}
                      </td>
                      <td className="px-4 py-3">{getPriorityBadge(task.priority)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700">
                          {task.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(task.scheduled_start).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {task.requires_evidence ? (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            Required
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            Optional
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
