'use client';

import React from 'react';
import { Siren } from 'lucide-react';
import { Task } from '@/app/types/task';
import { PRIORITY_COLORS, getDueDateColor, formatDueDateShort, formatTime12Hour } from '@/app/utils/taskUtils';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  onSelect: () => void;
  onToggleComplete: (id: number) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isActive, onSelect, onToggleComplete }) => {
  const dueLabel    = formatDueDateShort(task.due_date);
  const dueTimeLabel = formatTime12Hour(typeof task.due_time === 'string' ? task.due_time : null);
  const dueColor    = getDueDateColor(task.due_date, task.completed);
  const priorityStyle = task.priority != null
    ? (PRIORITY_COLORS[task.priority] ?? { bg: '#2563eb', text: '#ffffff' })
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left px-4 py-3  transition-colors flex items-start gap-3 group"
      style={{ backgroundColor: isActive ? 'var(--tm-accent-subtle)' : 'transparent' }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-surface-raised)'; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
    >
      {/* Completion checkbox */}
      <span
        role="checkbox"
        aria-checked={task.completed}
        tabIndex={0}
        onClick={e => { e.stopPropagation(); onToggleComplete(task.id); }}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); onToggleComplete(task.id); }
        }}
        className="mt-0.5 flex-shrink-0 w-5 h-5  border-2 flex items-center justify-center cursor-pointer transition-colors"
        style={{
          borderColor: task.completed ? 'var(--tm-success)' : 'var(--tm-border)',
          backgroundColor: task.completed ? 'var(--tm-success)' : 'transparent',
        }}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 5l2.5 2.5L8 3" />
          </svg>
        )}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p
            className="text-lg font-medium truncate leading-snug flex-1 min-w-0"
            style={{
              color: task.completed ? 'var(--tm-text-muted)' : isActive ? 'var(--tm-accent)' : 'var(--tm-text-primary)',
              textDecoration: task.completed ? 'line-through' : 'none',
            }}
          >
            {task.title || 'Untitled Task'}
          </p>
          {priorityStyle && (
            <span
              className="flex-shrink-0 text-xs font-bold px-2 py-0.5  leading-tight flex items-center gap-1"
              style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text }}
            >
              <Siren className="w-3 h-3" />
              {task.priority}
            </span>
          )}
        </div>

        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs font-medium px-2 py-0.5 "
                style={{ backgroundColor: tag.color, color: '#ffffff' }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {dueLabel && (
          <div className="flex items-center gap-1 mt-0.5 text-sm" style={{ color: dueColor }}>
            <span>Due: {dueLabel}</span>
            {dueTimeLabel !== '--:--' && <span className="opacity-75">· {dueTimeLabel}</span>}
          </div>
        )}
      </div>
    </button>
  );
};

export default TaskItem;
