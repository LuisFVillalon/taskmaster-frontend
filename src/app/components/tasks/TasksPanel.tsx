'use client';

import React from 'react';
import { Filter, CheckSquare } from 'lucide-react';
import TaskItem from '@/app/components/task/TaskItem';
import { FilterType, Tag, Task } from '@/app/types/task';

interface TasksPanelProps {
  filter: FilterType;
  sortOrder: Record<FilterType, 'asc' | 'desc'>;
  selectedTags: Tag[];
  showTagDropdown: boolean;
  onTagDropdownToggle: () => void;
  onClearTags: () => void;
  onTagToggle: (tag: Tag) => void;
  onFilterChange: (f: FilterType) => void;
  onCreateTask: () => void;
  tags: Tag[];
  filteredTasks: Task[];
  onToggleComplete: (id: number) => void;
  onDeleteTask: (task: Task) => void;
  onUpdatePriority: (taskId: number, priority: number | null) => void;
  activeTaskCount: number;
  occupiedPriorities: number[];
  compact: boolean;
}

const TasksPanel: React.FC<TasksPanelProps> = ({
  filter,
  sortOrder,
  selectedTags,
  showTagDropdown,
  onTagDropdownToggle,
  onClearTags,
  onTagToggle,
  onFilterChange,
  onCreateTask,
  tags,
  filteredTasks,
  onToggleComplete,
  onDeleteTask,
  onUpdatePriority,
  activeTaskCount,
  occupiedPriorities,
  compact,
}) => {
  return (
    <div className="split-tasks flex flex-col space-y-2 sm:space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Tags filter button + dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={onTagDropdownToggle}
            className={`px-3 py-1.5  font-medium whitespace-nowrap text-sm flex items-center gap-1.5 ${selectedTags.length > 0 ? 'btn-primary' : 'btn-secondary'}`}
            style={selectedTags.length > 0 ? { backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' } : {}}
          >
            <Filter className="w-4 h-4" />
            Tags
            {selectedTags.length > 0 && (
              <span className="text-xs  px-1.5 py-0.5 font-semibold opacity-90">
                {selectedTags.length}
              </span>
            )}
          </button>

          {showTagDropdown && (
            <div
              className="absolute z-50 top-full mt-1 left-0 w-52  shadow-[var(--tm-shadow-lg)] border border-border overflow-hidden"
              style={{ backgroundColor: 'var(--tm-surface)' }}
            >
              <button
                onClick={onClearTags}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-raised transition-colors"
              >
                Clear tags
              </button>
              <div className="max-h-60 overflow-y-auto">
                {tags.map(tag => {
                  const checked = selectedTags.some(t => t.id === tag.id);
                  return (
                    <label
                      key={tag.id}
                      className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-surface-raised transition-colors text-text-primary"
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

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {(['all', 'active', 'priority'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1.5  font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-1.5 ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={filter === f ? { backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' } : {}}
            >
              {f === 'active' ? 'Due date' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="opacity-70">{sortOrder[f] === 'asc' ? '↑' : '↓'}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onCreateTask}
          className="ml-auto px-3 py-1.5  font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-1.5 btn-primary"
          style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
        >
          <CheckSquare className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="card p-6 sm:p-8 text-center mt-2">
          <div
            className="w-12 h-12  flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--tm-surface-raised)' }}
          >
            <Filter className="w-6 h-6 text-text-muted" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-2">No tasks found</h3>
          <p className="text-sm text-text-secondary">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto h-[50vh] lg:h-[600px] pl-2 pr-1 scrollbar-custom">
          {filteredTasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              index={index}
              onToggleComplete={onToggleComplete}
              tags={tags}
              onDeleteTask={onDeleteTask}
              onUpdatePriority={onUpdatePriority}
              activeTaskCount={activeTaskCount}
              occupiedPriorities={occupiedPriorities}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TasksPanel;
