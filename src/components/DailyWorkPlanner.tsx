import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface Resident {
  id: string;
  full_name: string;
  room_number: string;
}

interface Template {
  id: string;
  template_name: string;
  category_name: string;
  department: string;
  default_duration_minutes: number;
  default_priority: string;
  requires_certification: boolean;
}

interface PlannedTask {
  template_id: string;
  resident_id: string;
  scheduled_time: string;
  assigned_to?: string;
}

interface DailyWorkPlannerProps {
  targetDate?: Date;
}

const DEPARTMENTS = [
  { id: 'NURSING', label: 'Nursing', icon: '💊', color: 'blue' },
  { id: 'HOUSEKEEPING', label: 'Housekeeping', icon: '🧹', color: 'teal' },
  { id: 'KITCHEN', label: 'Kitchen', icon: '🍽️', color: 'orange' },
  { id: 'HYGIENE', label: 'Hygiene', icon: '🚿', color: 'cyan' },
  { id: 'MOBILITY', label: 'Mobility', icon: '🚶', color: 'green' },
  { id: 'NUTRITION', label: 'Nutrition', icon: '🥗', color: 'lime' },
  { id: 'MONITORING', label: 'Monitoring', icon: '📊', color: 'gray' }
];

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

export const DailyWorkPlanner: React.FC<DailyWorkPlannerProps> = ({ targetDate = new Date() }) => {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null;
  const [residents, setResidents] = useState<Resident[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('NURSING');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const agencyId = SHOWCASE_MODE ? showcaseContext?.mockAgencyId : null;

  useEffect(() => {
    if (agencyId) {
      loadResidents();
      loadTemplates();
    }
  }, [agencyId]);

  const loadResidents = async () => {
    if (!agencyId) return;

    try {
      // Use single RPC with simulation filtering
      const { data, error } = await supabase.rpc('get_agency_residents', {
        p_agency_id: agencyId,
        p_include_simulation: SHOWCASE_MODE
      });

      if (error) throw error;

      // Map metadata.room to room_number for display
      const mapped = (data || []).map(r => ({
        id: r.id,
        full_name: r.full_name,
        room_number: (r.metadata as any)?.room || 'N/A'
      }));

      setResidents(mapped);
      console.log('[DailyWorkPlanner] Loaded residents:', mapped.length);
    } catch (error) {
      console.error('Failed to load residents:', error);
    }
  };

  const loadTemplates = async () => {
    if (!agencyId) return;

    try {
      // Use single RPC with simulation filtering
      const { data, error } = await supabase.rpc('get_task_categories', {
        p_agency_id: agencyId,
        p_include_simulation: SHOWCASE_MODE
      });

      if (error) throw error;

      const formatted = (data || []).map(t => ({
        id: t.id,
        template_name: t.name,
        category_name: t.name,
        department: (t.metadata as any)?.department || mapCategoryToDepartment(t.category_type),
        default_duration_minutes: 30,
        default_priority: 'medium',
        requires_certification: false
      }));

      setTemplates(formatted);
      console.log('[DailyWorkPlanner] Loaded templates:', formatted.length);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const mapCategoryToDepartment = (categoryType: string): string => {
    const mapping: Record<string, string> = {
      'clinical': 'NURSING',
      'nutrition': 'NUTRITION',
      'cooking': 'KITCHEN',
      'hygiene': 'HYGIENE',
      'housekeeping': 'HOUSEKEEPING',
      'cleaning': 'HOUSEKEEPING',
      'monitoring': 'MONITORING'
    };
    return mapping[categoryType] || 'NURSING';
  };

  const handleAddTask = (residentId: string, time: string) => {
    if (!selectedTemplate) {
      alert('Please select a task template first');
      return;
    }

    const newTask: PlannedTask = {
      template_id: selectedTemplate,
      resident_id: residentId,
      scheduled_time: time
    };

    setPlannedTasks(prev => [...prev, newTask]);
    if (quickAddMode) {
      setSelectedTemplate(null);
    }
  };

  const handleRemoveTask = (index: number) => {
    setPlannedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePlan = async () => {
    if (plannedTasks.length === 0) {
      alert('No tasks to save');
      return;
    }

    setSaving(true);
    try {
      const dateStr = targetDate.toISOString().split('T')[0];

      const tasksToCreate = plannedTasks.map(pt => {
        const template = templates.find(t => t.id === pt.template_id);
        const resident = residents.find(r => r.id === pt.resident_id);

        const scheduledStart = new Date(`${dateStr}T${pt.scheduled_time}:00`);
        const scheduledEnd = new Date(scheduledStart.getTime() + (template?.default_duration_minutes || 30) * 60000);

        return {
          resident_id: pt.resident_id,
          template_id: pt.template_id,
          task_name: template?.template_name || 'Task',
          priority: template?.default_priority || 'medium',
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          state: 'scheduled',
          department: template?.department || 'NURSING',
          requires_evidence: true
        };
      });

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToCreate);

      if (error) throw error;

      alert(`Successfully created ${tasksToCreate.length} tasks for ${dateStr}`);
      setPlannedTasks([]);
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('Failed to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredTemplates = templates.filter(t => t.department === selectedDepartment);
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Daily Work Planner</h1>
          <p className="text-lg text-slate-600">
            Plan tasks for {targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-4">
            <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Select Department</h2>
              <div className="space-y-2">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    onClick={() => {
                      setSelectedDepartment(dept.id);
                      setSelectedTemplate(null);
                    }}
                    className={`w-full px-4 py-3 rounded-lg font-semibold text-left flex items-center gap-3 transition-all ${
                      selectedDepartment === dept.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="text-2xl">{dept.icon}</span>
                    <span>{dept.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Task Templates</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <div className="text-sm text-slate-600 text-center py-4">
                    No templates for this department
                  </div>
                ) : (
                  filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-all ${
                        selectedTemplate === template.id
                          ? 'bg-green-100 border-2 border-green-500 font-bold text-green-900'
                          : 'bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {template.template_name}
                      {template.requires_certification && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">CERT REQUIRED</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedTemplateData && (
              <div className="bg-green-50 rounded-xl p-4 border-2 border-green-300">
                <div className="text-sm font-bold text-green-900 mb-2">SELECTED</div>
                <div className="text-lg font-bold text-green-900">{selectedTemplateData.template_name}</div>
                <div className="text-sm text-green-700 mt-2">
                  Duration: {selectedTemplateData.default_duration_minutes} min
                </div>
              </div>
            )}
          </div>

          <div className="col-span-9">
            <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Add Tasks to Schedule</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-600">
                    {plannedTasks.length} task{plannedTasks.length !== 1 ? 's' : ''} planned
                  </div>
                  {plannedTasks.length > 0 && (
                    <button
                      onClick={handleSavePlan}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors"
                    >
                      {saving ? 'SAVING...' : `SAVE ${plannedTasks.length} TASK${plannedTasks.length !== 1 ? 'S' : ''}`}
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-4 py-3 text-left font-bold text-slate-900 border-2 border-slate-300">Resident</th>
                      {TIME_SLOTS.map(time => (
                        <th key={time} className="px-2 py-3 text-center font-bold text-slate-900 border-2 border-slate-300 text-sm">
                          {time}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map(resident => (
                      <tr key={resident.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 border-2 border-slate-200 font-semibold text-slate-900">
                          <div>{resident.full_name}</div>
                          <div className="text-xs text-slate-600">Room {resident.room_number}</div>
                        </td>
                        {TIME_SLOTS.map(time => {
                          const tasksAtTime = plannedTasks.filter(
                            pt => pt.resident_id === resident.id && pt.scheduled_time === time
                          );

                          return (
                            <td key={time} className="px-1 py-1 border-2 border-slate-200 align-top">
                              {tasksAtTime.length > 0 ? (
                                <div className="space-y-1">
                                  {tasksAtTime.map((task, idx) => {
                                    const template = templates.find(t => t.id === task.template_id);
                                    return (
                                      <div
                                        key={idx}
                                        className="bg-green-100 border border-green-400 rounded px-2 py-1 text-xs relative group"
                                      >
                                        <div className="font-semibold text-green-900 truncate">
                                          {template?.template_name.substring(0, 15)}
                                        </div>
                                        <button
                                          onClick={() => handleRemoveTask(plannedTasks.indexOf(task))}
                                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddTask(resident.id, time)}
                                  disabled={!selectedTemplate}
                                  className="w-full h-12 hover:bg-blue-50 disabled:hover:bg-transparent border-2 border-dashed border-transparent hover:border-blue-300 rounded transition-all text-slate-400 hover:text-blue-600 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
