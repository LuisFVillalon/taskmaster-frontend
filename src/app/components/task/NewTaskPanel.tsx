'use client';

import React, { useState } from 'react';
import { Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { BaseTaskForm, Tag } from '@/app/types/task';
import TaskFormFields, { TaskFormData } from './TaskFormFields';

interface NewTaskPanelProps {
  newTask: BaseTaskForm;
  onTaskChange: (task: BaseTaskForm) => void;
  tags: Tag[];
  onToggleTag: (tag: Tag) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSmartPlan: (task: BaseTaskForm) => Promise<void>;
  onCancel: () => void;
  activeTaskCount: number;
  usedPriorityLevels: number[];
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const NewTaskPanel: React.FC<NewTaskPanelProps> = ({
  newTask, onTaskChange, tags, onToggleTag, onSubmit, onSmartPlan, onCancel,
  activeTaskCount, usedPriorityLevels, sidebarOpen, onToggleSidebar,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSmartPlan = !!newTask.category;

  const handleFieldChange = (next: TaskFormData) => {
    onTaskChange({ ...newTask, ...next } as BaseTaskForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isSmartPlan) {
        await onSmartPlan(newTask);
      } else {
        onSubmit(e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--tm-surface)' }}>

      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-4 py-2 border-b border-border-subtle flex-wrap shrink-0"
        style={{ backgroundColor: 'var(--tm-surface-raised)' }}
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="hidden sm:flex px-2 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--tm-text-secondary)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-surface-raised)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--tm-text-primary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--tm-text-secondary)';
          }}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="hidden sm:block w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--tm-border)' }} />

        <span className="text-sm font-semibold" style={{ color: 'var(--tm-text-primary)' }}>New Task</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--tm-text-secondary)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-surface-raised)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            form="new-task-panel-form"
            disabled={isLoading}
            className="btn btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isSmartPlan ? 'Generating…' : 'Creating…'}
              </>
            ) : isSmartPlan ? (
              'Create Smart Plan'
            ) : (
              'Create Task'
            )}
          </button>
        </div>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto scrollbar-custom">
        <form
          id="new-task-panel-form"
          onSubmit={handleSubmit}
          className="px-6 sm:px-10 py-6 space-y-5"
        >
          <TaskFormFields
            values={newTask as TaskFormData}
            onChange={handleFieldChange}
            tags={tags}
            onToggleTag={onToggleTag}
            activeTaskCount={activeTaskCount}
            usedPriorityLevels={usedPriorityLevels}
            showCategory
          />

          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--tm-danger)' }}
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default NewTaskPanel;
