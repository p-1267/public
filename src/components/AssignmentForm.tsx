import React, { useState } from 'react';
import { useDepartmentPersonnel } from '../hooks/useDepartments';

interface AssignmentFormProps {
  departmentId: string;
  onClose: () => void;
  onSave: () => void;
}

interface ChecklistTask {
  task: string;
  completed: boolean;
}

const DEPARTMENT_TASK_TEMPLATES: Record<string, string[]> = {
  NURSING: [
    'Review medication list',
    'Check resident allergies',
    'Administer scheduled medications',
    'Monitor for adverse reactions',
    'Document administration in system',
    'Update care plan notes',
    'Escalate abnormal findings'
  ],
  HOUSEKEEPING: [
    'Dust surfaces and furniture',
    'Vacuum floors and carpets',
    'Clean and sanitize bathroom',
    'Change linens',
    'Empty trash and replace liners',
    'Restock supplies',
    'Final inspection and room ready check'
  ],
  KITCHEN: [
    'Review meal plan and dietary restrictions',
    'Check allergy list',
    'Prepare meal according to specifications',
    'Deliver tray to resident',
    'Log meal intake',
    'Note calories/nutrition consumed',
    'Clean up and document'
  ],
  HYGIENE: [
    'Prepare bathing area',
    'Assist with shower/bath',
    'Provide grooming assistance',
    'Oral care',
    'Skin check and moisturizing',
    'Document any concerns',
    'Ensure resident comfort'
  ],
  MOBILITY: [
    'Check mobility aids',
    'Assist with transfers',
    'Supervised walking/exercise',
    'Reposition as needed',
    'Fall-risk assessment',
    'Document mobility level',
    'Report changes to supervisor'
  ],
  NUTRITION: [
    'Review dietary plan',
    'Check supplement schedule',
    'Monitor hydration',
    'Document intake',
    'Consult with dietitian if needed',
    'Update nutrition goals'
  ],
  MONITORING: [
    'Check vital signs',
    'Review device readings',
    'Monitor alert history',
    'Document observations',
    'Check safety systems',
    'Report anomalies',
    'Update monitoring logs'
  ]
};

export const AssignmentForm: React.FC<AssignmentFormProps> = ({ departmentId, onClose, onSave }) => {
  const { personnel } = useDepartmentPersonnel(departmentId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [shiftType, setShiftType] = useState<'day' | 'evening' | 'night'>('day');
  const [shiftStart, setShiftStart] = useState('07:00');
  const [shiftEnd, setShiftEnd] = useState('09:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [locationArea, setLocationArea] = useState('');
  const [checklist, setChecklist] = useState<ChecklistTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');

  const addTask = (taskText: string) => {
    if (taskText.trim()) {
      setChecklist([...checklist, { task: taskText.trim(), completed: false }]);
      setNewTaskText('');
    }
  };

  const removeTask = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const moveTaskUp = (index: number) => {
    if (index === 0) return;
    const newChecklist = [...checklist];
    [newChecklist[index - 1], newChecklist[index]] = [newChecklist[index], newChecklist[index - 1]];
    setChecklist(newChecklist);
  };

  const moveTaskDown = (index: number) => {
    if (index === checklist.length - 1) return;
    const newChecklist = [...checklist];
    [newChecklist[index], newChecklist[index + 1]] = [newChecklist[index + 1], newChecklist[index]];
    setChecklist(newChecklist);
  };

  const loadTemplateForDepartment = (deptCode: string) => {
    const templates = DEPARTMENT_TASK_TEMPLATES[deptCode] || [];
    setChecklist(templates.map(task => ({ task, completed: false })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Assignment created:', {
      title,
      description,
      assignedToId,
      shiftType,
      shiftStart,
      shiftEnd,
      priority,
      locationArea,
      checklist
    });
    onSave();
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Create New Assignment</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Assignment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="e.g., Morning Medication Round"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Assign To *
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Select staff member...</option>
              {personnel.map((person) => (
                <option key={person.id} value={person.user_id}>
                  {person.display_name} - {person.position_title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="Detailed description of the assignment..."
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Shift Type *
            </label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="day">Day (07:00 - 15:00)</option>
              <option value="evening">Evening (15:00 - 23:00)</option>
              <option value="night">Night (23:00 - 07:00)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Start Time *
            </label>
            <input
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              End Time *
            </label>
            <input
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              required
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Priority *
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Location / Area
            </label>
            <input
              type="text"
              value={locationArea}
              onChange={(e) => setLocationArea(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="e.g., Wing A, Rooms 101-105"
            />
          </div>
        </div>

        <div className="border-t-2 border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-lg font-bold text-slate-900">
              Task Checklist
            </label>
            <div className="flex gap-2">
              {Object.keys(DEPARTMENT_TASK_TEMPLATES).map(deptCode => (
                <button
                  key={deptCode}
                  type="button"
                  onClick={() => loadTemplateForDepartment(deptCode)}
                  className="px-3 py-1 text-xs border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-semibold"
                >
                  Load {deptCode} Template
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {checklist.map((task, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveTaskUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTaskDown(index)}
                    disabled={index === checklist.length - 1}
                    className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 text-slate-900">{task.task}</div>
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask(newTaskText))}
              placeholder="Add a task to the checklist..."
              className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => addTask(newTaskText)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Add Task
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t-2 border-slate-200">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Create Assignment
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
