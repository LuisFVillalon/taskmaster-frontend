import React from 'react';
import { Check, Clock, Trash2, SquarePen, BarChart3, Calendar, Siren } from 'lucide-react';
import { Task } from '@/app/types/task';
import {
  getDueColor, getDurationColor, getComplexityColor,
  formatTime12Hour, formatDueDate, getPriorityStyle,
} from '@/app/utils/taskUtils';

interface TaskItemProps {
  task: Task;
  index: number;
  onToggleComplete?: (id: number) => void;
  tags: Array<{ id: number; name: string; color: string }>;
  onDeleteTask?: (task: Task) => void;
  onEditTaskClick?: (params: { status: boolean; task: Task }) => void;
  /** Render a condensed single-row layout when the column is too narrow. */
  compact?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task, index, onToggleComplete, tags, onDeleteTask, onEditTaskClick,
  compact = false,
}) => {
  const priorityStyle = getPriorityStyle(task.priority);

  const normalizedDueDate: string | null =
    task.due_date instanceof Date ? task.due_date.toISOString() : task.due_date ?? null;
  const normalizedDueTime: string | null =
    task.due_time instanceof Date ? task.due_time.toISOString() : task.due_time ?? null;

  const tagChips = (pl: string) =>
    task.tags?.length > 0 && (
      <div className={`flex items-center gap-1.5 flex-wrap ${pl}`}>
        {task.tags.map((tagName, i) => {
          const tagData = tags.find(t => t.name === tagName.name);
          return (
            <span
              key={i}
              className="chip text-[9px] px-1.5 py-0.5"
              style={{ backgroundColor: tagData?.color ?? 'var(--tm-accent)', color: 'white', borderRadius: '6px' }}
            >
              {tagName.name}
            </span>
          );
        })}
      </div>
    );

  if (compact) {
    return (
      <div
        className={`card px-3 py-2 animate-fade-in ${task.completed ? 'opacity-75' : ''}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggleComplete?.(task.id)}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
              task.completed ? 'border-[var(--tm-success)] bg-[var(--tm-success)]' : 'border-border hover:border-accent'
            }`}
          >
            {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
          </button>

          <span
            className={`flex-1 min-w-0 text-sm font-semibold truncate ${
              task.completed ? 'line-through text-text-muted' : 'text-text-primary'
            }`}
          >
            {task.title}
          </span>

          {task.priority != null && (
            <span
              className="chip text-[9px] font-bold flex-shrink-0 flex items-center gap-1"
              style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text, padding: '0.1rem 0.45rem', borderRadius: '9px' }}
            >
              <Siren className="w-3 h-3" />
              {task.priority}
            </span>
          )}

          <button
            onClick={() => onEditTaskClick?.({ status: true, task })}
            className="btn btn-ghost p-1 flex-shrink-0"
            title="Edit task" aria-label="Edit task"
          >
            <SquarePen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteTask?.(task)}
            className="btn btn-danger-ghost p-1 flex-shrink-0"
            title="Delete task" aria-label="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {tagChips('mt-1.5 pl-6')}
      </div>
    );
  }

  return (
    <div
      className={`card p-4 sm:p-6 animate-fade-in ${task.completed ? 'opacity-75' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          onClick={() => onToggleComplete?.(task.id)}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className={`mt-0.5 sm:mt-1 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
            task.completed ? 'border-[var(--tm-success)] bg-[var(--tm-success)]' : 'border-border hover:border-accent'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 sm:gap-4 mb-1.5 sm:mb-2">
            <h3
              className={`text-base sm:text-lg font-semibold leading-snug ${
                task.completed ? 'text-text-muted line-through' : 'text-text-primary'
              }`}
            >
              {task.title}
            </h3>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {task.category && (
                <span
                  className="chip text-[10px] font-bold uppercase tracking-wide"
                  style={{ backgroundColor: 'var(--tm-accent-subtle)', color: 'var(--tm-accent)' }}
                >
                  {task.category}
                </span>
              )}
              {task.priority != null && (
                <span
                  className="chip font-bold flex items-center gap-1"
                  style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text, padding: '0.1rem 0.45rem', borderRadius: '9px' }}
                >
                  <Siren className="w-4 h-4" />
                  {task.priority}
                </span>
              )}
              <button
                onClick={() => onEditTaskClick?.({ status: true, task })}
                className="btn btn-ghost p-1.5"
                title="Edit task" aria-label="Edit task"
              >
                <SquarePen className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteTask?.(task)}
                className="btn btn-danger-ghost p-1.5"
                title="Delete task" aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p
            className={`text-xs sm:text-sm mb-3 leading-relaxed px-3 py-2 rounded-lg ${
              task.completed ? 'line-through text-text-muted' : 'text-text-secondary'
            }`}
            style={{ backgroundColor: 'var(--tm-surface-raised)' }}
          >
            {task.description}
          </p>

          {tagChips('mb-3')}

          <div className="pt-3 border-t border-border-subtle">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">Due</p>
                <div className={`flex flex-col gap-1 px-3 py-2 rounded-lg ${getDueColor(task.due_date)}`}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDueDate(normalizedDueDate, normalizedDueTime ?? undefined)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime12Hour(typeof task.due_time === 'string' ? task.due_time : null)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">Est. Duration</p>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getDurationColor(Number(task.estimated_time))}`}>
                  <Clock className="w-4 h-4" />
                  <span>{task.estimated_time != null ? `${task.estimated_time} hrs` : '--'}</span>
                </div>
              </div>

              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">Complexity</p>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getComplexityColor(task.complexity)}`}>
                  <BarChart3 className="w-4 h-4" />
                  <span>Level {task.complexity ?? '--'}</span>
                </div>
              </div>

              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">Created</p>
                <div
                  className="flex flex-col gap-1 px-3 py-2 rounded-lg text-text-secondary"
                  style={{ backgroundColor: 'var(--tm-surface-raised)' }}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(task.created_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(task.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
