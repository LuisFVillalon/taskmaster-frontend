'use client';

import React from 'react';
import { Search, Filter, Files, FolderPen, X, Blocks, ListTodo, Menu } from 'lucide-react';
import { FilterType, Tag } from '@/app/types/task';

interface TaskControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filter: FilterType;
  sortOrder: Record<FilterType, 'asc' | 'desc'>;
  onFilterChange: (filter: FilterType) => void;
  selectedTags: Tag[];
  onTagToggle: (tag: Tag) => void;
  showTagDropdown: boolean;
  onTagDropdownToggle: () => void;
  tags: Tag[];
  searchPlaceholder?: string;
  onNewTask?: () => void;
  onNewNote?: () => void;
  onViewNotes?: () => void;
  onEditTag?: () => void;
  onEditHabit?: () => void;
  menuCollapsed: boolean;
  onToggleMenu: () => void;
}

export const TaskControls: React.FC<TaskControlsProps> = ({
  searchTerm,
  onSearchChange,
  filter,
  sortOrder,
  onFilterChange,
  selectedTags,
  onTagToggle,
  showTagDropdown,
  onTagDropdownToggle,
  tags,
  searchPlaceholder = 'Search tasks…',
  onNewTask,
  onViewNotes,
  onEditTag,
  onEditHabit,
  menuCollapsed,
  onToggleMenu,
}) => {
  const panelAnimationClass = menuCollapsed ? 'menu-panel-close' : 'menu-panel-open';

  if (menuCollapsed) {
    return null;
  }

  return (
    <>
        <div className={`fixed inset-x-0 top-0 z-40 ${panelAnimationClass}`}>
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 py-4">
        <div className="card">
          <div className="flex flex-col gap-4 px-4 py-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Menu className="w-5 h-5 text-text-secondary" />
            <div>
              <p className="font-semibold text-text-primary">Main Menu</p>
              <p className="text-xs text-text-secondary">Search, filter, and quick actions</p>
            </div>
          </div>
          <button
            onClick={onToggleMenu}
            className="rounded-xl p-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--tm-surface-raised)', color: 'var(--tm-text-primary)' }}
            aria-expanded={!menuCollapsed}
            aria-label="Collapse task menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input-field pl-9 sm:pl-10"
              />
            </div>

          </div>

          {/* Filters row */}
          <div className="flex gap-2 flex-wrap">
            {/* Tag filter dropdown */}
            <div className="relative">
              <button
                onClick={onTagDropdownToggle}
                className="px-3 sm:px-4 py-2 rounded-xl font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-2 btn-secondary cursor-default"
              >
                <Filter className="w-4 h-4" />
                Tags
                {selectedTags.length > 0 && (
                  <span
                    className="ml-1 text-xs rounded-full px-1.5 py-0.5 font-semibold"
                    style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
                  >
                    {selectedTags.length}
                  </span>
                )}
              </button>

              {showTagDropdown && (
                <div
                  className="absolute z-50 left-full ml-2 top-0 w-56 rounded-xl shadow-[var(--tm-shadow-lg)] border border-border overflow-hidden animate-slide-up"
                  style={{ backgroundColor: 'var(--tm-surface)' }}
                  onMouseLeave={() => onTagDropdownToggle()}
                >
                  <button
                    onClick={() => {
                      selectedTags.forEach(tag => onTagToggle(tag));
                      onTagDropdownToggle();
                    }}
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
                            className="accent-accent rounded"
                          />
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
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
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {(['all', 'active',  'priority', 'completed', 'complexity', 'duration',  'created'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => onFilterChange(f)}
                  className={`px-3 sm:px-4 py-2 rounded-xl font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-2 ${
                    filter === f
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  style={filter === f ? {
                    backgroundColor: 'var(--tm-accent)',
                    color: 'var(--tm-accent-text)',
                  } : {}}
                >
                  {f === 'active' ? 'Due date' : f === 'duration' ? 'Est. Time' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-1 opacity-70">
                    {sortOrder[f] === 'asc' ? '↑' : '↓'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap ml-auto">
            {onEditTag && (
              <button
                onClick={onEditTag}
                className="px-3 sm:px-4 py-2 rounded-xl font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-2 btn-primary"
                style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
              >
                <FolderPen className="w-4 h-4" />
                Manage Tags
              </button>
            )}
            {onEditHabit && (
              <button
                onClick={onEditHabit}
                className="px-3 sm:px-4 py-2 rounded-xl font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-2 btn-primary"
                style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
              >
                <Blocks className="w-4 h-4" />
                Manage Habits
              </button>
            )}
            {onNewTask && (
              <button
                onClick={onNewTask}
                className="px-3 sm:px-4 py-2 rounded-xl font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-2 btn-primary"
                style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
              >
                <ListTodo className="w-4 h-4" />
                Manage Tasks
              </button>
            )}
            {onViewNotes && (
              <button
                onClick={onViewNotes}
                className="px-3 sm:px-4 py-2 rounded-xl font-medium whitespace-nowrap text-sm flex-shrink-0 flex items-center gap-2 btn-primary"
                style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
              >
                <Files className="w-4 h-4" />
                Manage Notes
              </button>
            )}
          </div>

          {/* Active tag chips */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="chip flex items-center gap-1.5 text-white text-xs font-medium px-2 py-1"
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
        </div>
      </div>
    </div>
  </div>
    </>
  );
};

export default TaskControls;