import React, { Dispatch, SetStateAction, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { BaseTaskForm, Tag, Task } from '@/app/types/task';
import TaskFormFields, { TaskFormData } from './TaskFormFields';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTask: BaseTaskForm;
  onTaskChange: (task: BaseTaskForm) => void;
  tags: Tag[];
  onToggleTag: (tag: Tag) => void;
  onSubmit: (e: React.FormEvent) => void;
  handleNewAITask: (task: BaseTaskForm) => Promise<void>;
  newAITask: Task | undefined;
  setNewAITask: Dispatch<SetStateAction<Task | undefined>>;
  activeTaskCount: number;
  usedPriorityLevels: number[];
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen, onClose, newTask, onTaskChange, tags, onToggleTag,
  onSubmit, handleNewAITask, newAITask, setNewAITask,
  activeTaskCount, usedPriorityLevels,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const isAIMode = !!newTask.category;

  const handleFieldChange = (next: TaskFormData) => {
    onTaskChange({ ...newTask, ...next } as BaseTaskForm);
    setNewAITask(prev => ({ ...prev, ...next } as Task));
  };

  const handleToggleTag = (tag: Tag) => {
    onToggleTag(tag);
    setNewAITask(prev => {
      if (!prev) return prev;
      const alreadySelected = prev.tags?.some(t => t.id === tag.id);
      return {
        ...prev,
        tags: alreadySelected
          ? (prev.tags ?? []).filter(t => t.id !== tag.id)
          : [...(prev.tags ?? []), tag],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setIsLoading(true);
    await onSubmit(e);
    setIsLoading(false);
  };

  const handleAISubmit = async () => {
    setIsLoading(true);
    await handleNewAITask(newAITask!);
    setIsLoading(false);
  };

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-custom">
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-[1.25rem] border-b border-border-subtle"
          style={{ backgroundColor: 'var(--tm-surface)' }}
        >
          <h2 className="text-xl font-bold text-text-primary">Create New Task</h2>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-text-muted -mb-1">
            Fields marked <span style={{ color: 'var(--tm-danger)' }}>*</span> are required to save the task.
          </p>

          <TaskFormFields
            values={newTask as TaskFormData}
            onChange={handleFieldChange}
            tags={tags}
            onToggleTag={handleToggleTag}
            activeTaskCount={activeTaskCount}
            usedPriorityLevels={usedPriorityLevels}
            showCategory
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-secondary flex-1 py-2.5">
              Cancel
            </button>
            {isAIMode ? (
              <button type="button" onClick={handleAISubmit} disabled={isLoading} className="btn btn-primary flex-1 py-2.5">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create AI Task Plan'}
              </button>
            ) : (
              <button type="submit" disabled={isLoading} className="btn btn-primary flex-1 py-2.5">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Task'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;
