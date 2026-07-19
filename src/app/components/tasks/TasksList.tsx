'use client';

import React from 'react';
import { Plus, Search, CheckSquare, Filter } from 'lucide-react';
import { Task, FilterType, Tag } from '@/app/types/task';
import TaskItem from './TaskItem';

interface TasksListProps {
  tasks: Task[];
  activeTaskId: number | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectTask: (task: Task) => void;
  onNewTask: () => void;
  onToggleComplete: (id: number) => void;
  filter: FilterType;
  sortOrder: Record<FilterType, 'asc' | 'desc'>;
  onFilterChange: (filter: FilterType) => void;
  tags: Tag[];
  selectedTags: Tag[];
  onTagToggle: (tag: Tag) => void;
  showTagDropdown: boolean;
  onTagDropdownToggle: () => void;
}

const TasksList: React.FC<TasksListProps> = ({
  tasks,
  activeTaskId,
  searchTerm,
  onSearchChange,
  onSelectTask,
  onNewTask,
  onToggleComplete,
  filter,
  sortOrder,
  onFilterChange,
  tags,
  selectedTags,
  onTagToggle,
  showTagDropdown,
  onTagDropdownToggle,
}) => {
  const active = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle"
        style={{ backgroundColor: 'var(--tm-surface)' }}
      >
        <h2 className="text-xl font-bold text-text-primary">Tasks</h2>
        <button onClick={onNewTask} className="btn btn-primary px-3 py-1.5 text-base gap-1.5">
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks…"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        {/* relative wrapper lets the dropdown escape the overflow-x-auto scroll container */}
        <div className="relative">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={onTagDropdownToggle}
              className="px-2.5 py-1  text-sm font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1 btn-secondary"
            >
              <Filter className="w-3 h-3" />
              Tags
              {selectedTags.length > 0 && (
                <span
                  className="ml-0.5 text-xs  px-1.5 font-semibold"
                  style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
                >
                  {selectedTags.length}
                </span>
              )}
            </button>
            {(['all', 'active', 'priority', 'completed', 'duration', 'created'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`px-2.5 py-1  text-sm font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                  filter === f ? 'btn-primary' : 'btn-secondary'
                }`}
                style={filter === f ? { backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' } : {}}
              >
                {f === 'active' ? 'Due date' : f === 'duration' ? 'Est. Time' : f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="opacity-70">{sortOrder[f] === 'asc' ? '↑' : '↓'}</span>
              </button>
            ))}
          </div>

          {showTagDropdown && (
            <div
              className="absolute z-50 left-0 top-full mt-1 w-52  shadow-lg border border-border overflow-hidden"
              style={{ backgroundColor: 'var(--tm-surface)' }}
            >
              <button
                onClick={() => {
                  selectedTags.forEach(tag => onTagToggle(tag));
                  onTagDropdownToggle();
                }}
                className="w-full text-left px-4 py-2.5 text-base font-medium text-text-secondary hover:bg-surface-raised transition-colors"
              >
                Clear tags
              </button>
              <div className="max-h-60 overflow-y-auto">
                {tags.map(tag => {
                  const checked = selectedTags.some(t => t.id === tag.id);
                  return (
                    <label
                      key={tag.id}
                      className="flex items-center gap-3 px-4 py-2 text-base cursor-pointer hover:bg-surface-raised transition-colors text-text-primary"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onTagToggle(tag)}
                        className="accent-accent "
                      />
                      <span
                        className="w-3 h-3  flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Active tag chips ─────────────────────────────────────────────── */}
      {selectedTags.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="flex items-center gap-1 text-white text-sm font-medium px-2 py-0.5"
              style={{ backgroundColor: tag.color, borderRadius: '10px' }}
            >
              {tag.name}
              <button
                onClick={() => onTagToggle(tag)}
                className="hover:opacity-70 transition-opacity leading-none"
                aria-label={`Remove ${tag.name} filter`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Task list ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-custom">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="w-12 h-12  flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--tm-surface-raised)' }}
            >
              <CheckSquare className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-base font-medium text-text-secondary">
              {searchTerm ? 'No tasks match your search' : 'No tasks yet'}
            </p>
            {!searchTerm && (
              <p className="text-sm text-text-muted mt-1">Click New Task to get started</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 pt-1">
            {active.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isActive={task.id === activeTaskId}
                onSelect={() => onSelectTask(task)}
                onToggleComplete={onToggleComplete}
              />
            ))}

            {completed.length > 0 && (
              <>
                {active.length > 0 && (
                  <div
                    className="mx-3 my-2 border-t"
                    style={{ borderColor: 'var(--tm-border-subtle)' }}
                  />
                )}
                <p className="px-3 py-1 text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Completed
                </p>
                {completed.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isActive={task.id === activeTaskId}
                    onSelect={() => onSelectTask(task)}
                    onToggleComplete={onToggleComplete}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksList;
