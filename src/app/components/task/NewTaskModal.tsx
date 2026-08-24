import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { BaseTaskForm, Tag } from '@/app/types/task';
import TaskFormFields, { TaskFormData } from './TaskFormFields';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTask: BaseTaskForm;
  onTaskChange: (task: BaseTaskForm) => void;
  tags: Tag[];
  onToggleTag: (tag: Tag) => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  activeTaskCount: number;
  usedPriorityLevels: number[];
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen, onClose, newTask, onTaskChange, tags, onToggleTag,
  onSubmit, activeTaskCount, usedPriorityLevels,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFieldChange = (next: TaskFormData) => {
    onTaskChange({ ...newTask, ...next } as BaseTaskForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onSubmit(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-custom">
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between border-b border-border-subtle"
          style={{ backgroundColor: 'var(--tm-surface)' }}
        >
          <h2 className="text-xl font-bold text-text-primary">Create New Task</h2>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          <TaskFormFields
            values={newTask as TaskFormData}
            onChange={handleFieldChange}
            tags={tags}
            onToggleTag={onToggleTag}
            activeTaskCount={activeTaskCount}
            usedPriorityLevels={usedPriorityLevels}
          />

          {error && (
            <p className="text-sm rounded-md px-3 py-2" style={{ backgroundColor: 'var(--tm-danger-subtle)', color: 'var(--tm-danger)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-secondary flex-1 py-2.5">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary flex-1 py-2.5">
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;
