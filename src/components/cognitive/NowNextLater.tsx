import React from 'react';

export interface TaskItem {
  id: string;
  title: string;
  category: string;
  residentName?: string;
  room?: string;
  dueTime?: string;
  status: 'now' | 'next' | 'later' | 'overdue';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  evidence?: string[];
  assignedTo?: string;
  inProgressBy?: string;
  reason?: string;
}

interface NowNextLaterProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onStartTask: (taskId: string) => void;
  compact?: boolean;
}

export const NowNextLater: React.FC<NowNextLaterProps> = ({
  tasks,
  onTaskClick,
  onStartTask,
  compact = false
}) => {
  const now = tasks.filter(t => t.status === 'now' || t.status === 'overdue');
  const next = tasks.filter(t => t.status === 'next');
  const later = tasks.filter(t => t.status === 'later');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-red-300 text-red-900';
      case 'high': return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'normal': return 'bg-blue-50 border-blue-300 text-blue-900';
      default: return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  const TaskCard: React.FC<{ task: TaskItem }> = ({ task }) => (
    <div
      className={`p-3 border-l-4 rounded ${getPriorityColor(task.priority)} cursor-pointer hover:shadow-md transition-all`}
      onClick={() => onTaskClick(task)}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <div className="font-semibold text-sm">{task.title}</div>
          {task.residentName && (
            <div className="text-xs opacity-75 mt-1">
              {task.residentName} {task.room && `• Room ${task.room}`}
            </div>
          )}
        </div>
        {task.dueTime && (
          <div className="text-xs font-medium ml-2">{task.dueTime}</div>
        )}
      </div>

      {task.inProgressBy && (
        <div className="text-xs mt-2 bg-white/50 px-2 py-1 rounded">
          🔄 In progress by {task.inProgressBy}
        </div>
      )}

      {task.reason && (
        <div className="text-xs mt-2 opacity-75 italic">
          {task.reason}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartTask(task.id);
          }}
          className="text-xs px-3 py-1 bg-white/80 hover:bg-white rounded font-medium"
        >
          Start
        </button>
        <span className="text-xs px-2 py-1 bg-white/50 rounded">{task.category}</span>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {now.length > 0 && (
          <div>
            <div className="text-xs font-bold text-red-600 mb-1">NOW ({now.length})</div>
            <div className="space-y-1">
              {now.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          </div>
        )}
        {next.length > 0 && (
          <div>
            <div className="text-xs font-bold text-orange-600 mb-1">NEXT ({next.length})</div>
            <div className="space-y-1">
              {next.slice(0, 3).map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <span className="text-2xl">🔴</span>
            NOW
          </h2>
          <span className="text-sm font-medium text-gray-600">{now.length} tasks</span>
        </div>
        {now.length === 0 ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
            ✓ Nothing urgent right now
          </div>
        ) : (
          <div className="space-y-2">
            {now.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-orange-600 flex items-center gap-2">
            <span className="text-2xl">🟡</span>
            NEXT
          </h2>
          <span className="text-sm font-medium text-gray-600">{next.length} tasks</span>
        </div>
        {next.length === 0 ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded text-gray-600 text-sm">
            No upcoming tasks
          </div>
        ) : (
          <div className="space-y-2">
            {next.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </section>

      {later.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-600 flex items-center gap-2">
              <span className="text-2xl">⚪</span>
              LATER
            </h2>
            <span className="text-sm font-medium text-gray-600">{later.length} tasks</span>
          </div>
          <div className="space-y-2">
            {later.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </section>
      )}
    </div>
  );
};
