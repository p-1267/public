import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardData {
  summary: {
    total_tasks: number;
    completed: number;
    in_progress: number;
    overdue: number;
    completion_rate: number;
    staff_on_duty: number;
    residents_served: number;
  };
  departments: Array<{
    department_id: string;
    department_name: string;
    department_code: string;
    supervisor_name: string;
    total_tasks: number;
    completed: number;
    in_progress: number;
    overdue: number;
    completion_rate: number;
    staff_count: number;
    status: string;
  }>;
  issues: Array<{
    task_id: string;
    task_name: string;
    resident_name: string;
    issue_type: string;
    priority: string;
    department_name: string;
  }>;
  report_date: string;
  generated_at: string;
}

interface ManagerDashboardProps {
  agencyId: string;
  date?: Date;
}

export function ManagerDashboard({
  agencyId,
  date = new Date(),
}: ManagerDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<string>('csv');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, [agencyId, date]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];

      const { data: dashboardData, error } = await supabase.rpc(
        'get_manager_dashboard_data',
        {
          p_agency_id: agencyId,
          p_date: dateStr,
        }
      );

      if (error) throw error;
      setData(dashboardData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  };

  const handleExport = () => {
    if (!data) return;

    let content = '';
    const timestamp = new Date().toISOString();

    if (exportFormat === 'csv') {
      content = `Manager Dashboard Export - ${data.report_date}\n\n`;
      content += `Summary\n`;
      content += `Total Tasks,${data.summary.total_tasks}\n`;
      content += `Completed,${data.summary.completed}\n`;
      content += `In Progress,${data.summary.in_progress}\n`;
      content += `Overdue,${data.summary.overdue}\n`;
      content += `Completion Rate,${data.summary.completion_rate}%\n`;
      content += `Staff On Duty,${data.summary.staff_on_duty}\n`;
      content += `Residents Served,${data.summary.residents_served}\n\n`;

      content += `Departments\n`;
      content += `Department,Code,Supervisor,Total,Completed,In Progress,Overdue,Completion Rate,Staff Count\n`;
      data.departments.forEach((dept) => {
        content += `${dept.department_name},${dept.department_code},${dept.supervisor_name},${dept.total_tasks},${dept.completed},${dept.in_progress},${dept.overdue},${dept.completion_rate}%,${dept.staff_count}\n`;
      });

      content += `\nIssues Requiring Attention\n`;
      content += `Task,Resident,Type,Priority,Department\n`;
      data.issues.forEach((issue) => {
        content += `${issue.task_name},${issue.resident_name},${issue.issue_type},${issue.priority},${issue.department_name}\n`;
      });
    } else {
      content = JSON.stringify(data, null, 2);
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manager-dashboard-${timestamp}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIssueColor = (type: string) => {
    const colors: { [key: string]: string } = {
      overdue: 'bg-red-100 text-red-800',
      blocked: 'bg-orange-100 text-orange-800',
      rejected: 'bg-yellow-100 text-yellow-800',
      needs_revision: 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Manager Dashboard
            </h2>
            <p className="text-sm text-gray-600">
              Daily operations overview for {date.toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(data.generated_at).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
            >
              Export
            </button>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-700 font-medium mb-1">
                Total Tasks
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {data.summary.total_tasks}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-700 font-medium mb-1">
                Completed
              </div>
              <div className="text-3xl font-bold text-green-900">
                {data.summary.completed}
              </div>
              <div className="text-xs text-green-700 mt-1">
                {data.summary.completion_rate}% completion rate
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-700 font-medium mb-1">
                In Progress
              </div>
              <div className="text-3xl font-bold text-yellow-900">
                {data.summary.in_progress}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-700 font-medium mb-1">Overdue</div>
              <div className="text-3xl font-bold text-red-900">
                {data.summary.overdue}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 font-medium mb-1">
                Staff On Duty
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.staff_on_duty}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 font-medium mb-1">
                Residents Served
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {data.summary.residents_served}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            Department Performance
          </h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Supervisor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    In Progress
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    Overdue
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    Completion %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                    Staff
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.departments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No departments found
                    </td>
                  </tr>
                ) : (
                  data.departments.map((dept) => (
                    <tr
                      key={dept.department_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setSelectedDept(
                          selectedDept === dept.department_id
                            ? null
                            : dept.department_id
                        )
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {dept.department_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dept.department_code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {dept.supervisor_name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {dept.total_tasks}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">
                        {dept.completed}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-yellow-600">
                        {dept.in_progress}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">
                        {dept.overdue}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-bold ${getCompletionColor(
                            dept.completion_rate
                          )}`}
                        >
                          {dept.completion_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {dept.staff_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data.issues.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              Issues Requiring Attention ({data.issues.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {data.issues.map((issue) => (
                <div
                  key={issue.task_id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {issue.task_name}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getIssueColor(
                            issue.issue_type
                          )}`}
                        >
                          {issue.issue_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {issue.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Resident: {issue.resident_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Department: {issue.department_name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
