import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Task, Tag } from '@/app/types/task';
import TaskFormFields, { TaskFormData } from './TaskFormFields';

interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onTaskChange: (task: TaskFormData) => void;
  tags: Tag[];
  onToggleTag: (tag: Tag) => void;
  onSubmit: (e: React.FormEvent) => void;
  activeTaskCount: number;
  usedPriorityLevels: number[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen, task, onClose, onTaskChange, tags, onToggleTag,
  onSubmit, activeTaskCount, usedPriorityLevels,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(e);
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
          <h2 className="text-xl font-bold text-text-primary">Edit Task</h2>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          <TaskFormFields
            values={task as TaskFormData}
            onChange={onTaskChange}
            tags={tags}
            onToggleTag={onToggleTag}
            activeTaskCount={activeTaskCount}
            usedPriorityLevels={usedPriorityLevels}
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-secondary flex-1 py-2.5">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary flex-1 py-2.5">
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
