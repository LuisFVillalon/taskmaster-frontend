/*
Purpose: This component renders an individual task item in the task list, displaying task details,
tags, due dates, and providing buttons for editing, deleting, and toggling completion.

Variables Summary:
- task: Task object containing title, description, completion status, due date, tags, etc.
- index: Number used for staggered animation delay in the list.
- onToggleComplete: Function to toggle the task's completion status.
- tags: Array of tag objects used to look up colors for displaying task tags.
- onDeleteTask: Function to delete the task.
- onEditTaskClick: Function to open the edit modal with the task data.

These variables are used to display task information and handle user interactions like completion toggle, edit, and delete.
*/

import React from 'react';
import { Check, Clock, Trash2, SquarePen, BarChart3, Calendar, Siren } from 'lucide-react';
import { Task } from '@/app/types/task';
import { getDueColor, getDurationColor, getComplexityColor, formatTime12Hour, formatDueDate } from '@/app/utils/taskUtils';

function getPriorityStyle(priority: number | null): { bg: string; text: string; padding: string; borderRadius: string } {
  if (priority === null) {
    return {
      bg: 'var(--tm-surface-raised)',
      text: 'var(--tm-text-muted)',
      padding: '0.1rem 0.45rem',
      borderRadius: '9px',
    };
  }

  if (priority === 1) {
    return {
      bg: '#dc2626',
      text: '#ffffff',
      padding: '0.1rem 0.45rem',
      borderRadius: '9px',
    };
  }

  if (priority === 2) {
    return {
      bg: '#ea580c',
      text: '#ffffff',
      padding: '0.1rem 0.45rem',
      borderRadius: '9px',
    };
  }

  if (priority === 3) {
    return {
      bg: '#f97316',
      text: '#ffffff',
      padding: '0.1rem 0.45rem',
      borderRadius: '9px',
    };
  }

  if (priority === 4) {
    return {
      bg: '#f59e0b',
      text: '#ffffff',
      padding: '0.1rem 0.45rem',
      borderRadius: '9px',
    };
  }

  if (priority === 5) {
    return {
      bg: '#eab308',
      text: '#ffffff',
      padding: '0.1rem 0.45rem',
      borderRadius: '9px',
    };
  }

  return {
    bg: '#2563eb',
    text: '#ffffff',
    padding: '0.1rem 0.45rem',
    borderRadius: '9px',
  };
}

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
  const handleDeleteTask = (taskToDelete: Task) => {
    onDeleteTask?.(taskToDelete);
  };
  const handleEditTask = ({ status, taskToEdit }: { status: boolean; taskToEdit: Task }) => {
    onEditTaskClick?.({ status, task: taskToEdit });
  };

  const normalizedDueDate: string | null =
    task.due_date instanceof Date ? task.due_date.toISOString() : task.due_date ?? null;
  const normalizedDueTime: string | null =
    task.due_time instanceof Date ? task.due_time.toISOString() : task.due_time ?? null;
  const priorityStyle = getPriorityStyle(task.priority);

  if (compact) {
    return (
      <div
        className={`card px-3 py-2 animate-fade-in ${task.completed ? 'opacity-75' : ''}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        {/* Row 1: checkbox · title · priority · actions */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggleComplete?.(task.id)}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
              task.completed
                ? 'border-[var(--tm-success)] bg-[var(--tm-success)]'
                : 'border-border hover:border-accent'
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
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.text,
                padding: priorityStyle.padding,
                borderRadius: priorityStyle.borderRadius,
              }}
            >
              <Siren className="w-3 h-3" />
              {task.priority}
            </span>
          )}

          <button
            onClick={() => handleEditTask({ status: true, taskToEdit: task })}
            className="btn btn-ghost p-1 flex-shrink-0"
            title="Edit task"
            aria-label="Edit task"
          >
            <SquarePen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteTask(task)}
            className="btn btn-danger-ghost p-1 flex-shrink-0"
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Row 2: tags */}
        {task.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 pl-6 flex-wrap">
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
        )}
      </div>
    );
  }

  return (
    <div
      className={`card p-4 sm:p-6 animate-fade-in ${task.completed ? 'opacity-75' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Completion toggle */}
        <button
          onClick={() => onToggleComplete?.(task.id)}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className={`mt-0.5 sm:mt-1 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
            task.completed
              ? 'border-[var(--tm-success)] bg-[var(--tm-success)]'
              : 'border-border hover:border-accent'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
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
                  style={{
                    backgroundColor: priorityStyle.bg,
                    color: priorityStyle.text,
                    padding: priorityStyle.padding,
                    borderRadius: priorityStyle.borderRadius,
                  }}
                >
                  <Siren className="w-4 h-4" />
                  {task.priority}
                </span>
              )}
              <button
                onClick={() => handleEditTask({ status: true, taskToEdit: task })}
                className="btn btn-ghost p-1.5"
                title="Edit task"
                aria-label="Edit task"
              >
                <SquarePen className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteTask(task)}
                className="btn btn-danger-ghost p-1.5"
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          <p
            className={`text-xs sm:text-sm mb-3 leading-relaxed px-3 py-2 rounded-lg ${
              task.completed ? 'line-through text-text-muted' : 'text-text-secondary'
            }`}
            style={{ backgroundColor: 'var(--tm-surface-raised)' }}
          >
            {task.description}
          </p>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {task.tags.map((tagName, i) => {
                const tagData = tags.find(t => t.name === tagName.name);
                return (
                  <span
                    key={i}
                    className="chip px-2"
                    style={{ backgroundColor: tagData?.color ?? 'var(--tm-accent)', color: 'white', borderRadius: '10px'}}
                  >
                    {tagName.name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Details grid */}
          <div className="pt-3 border-t border-border-subtle">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">

              {/* Due */}
              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">Due</p>
                <div className={`flex flex-col gap-1 px-3 py-2 rounded-lg ${getDueColor(task.due_date)}`}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDueDate(normalizedDueDate, normalizedDueTime)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime12Hour(typeof task.due_time === 'string' ? task.due_time : null)}</span>
                  </div>
                </div>
              </div>

              {/* Estimated Duration */}
              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">Est. Duration</p>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getDurationColor(Number(task.estimated_time))}`}>
                  <Clock className="w-4 h-4" />
                  <span>{task.estimated_time != null ? `${task.estimated_time} hrs` : '--'}</span>
                </div>
              </div>

              {/* Complexity */}
              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">Complexity</p>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getComplexityColor(task.complexity)}`}>
                  <BarChart3 className="w-4 h-4" />
                  <span>Level {task.complexity ?? '--'}</span>
                </div>
              </div>

              {/* Created */}
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
