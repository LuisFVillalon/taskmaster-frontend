import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Tag, EditTaskModalState, Task } from '@/app/types/task';
import TaskFormFields, { TaskFormData } from './TaskFormFields';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskChange: (task: Task) => void;
  tags: Tag[];
  onToggleTag: (tag: Tag) => void;
  onSubmit: (e: React.FormEvent) => void;
  values: EditTaskModalState;
  activeTaskCount: number;
  usedPriorityLevels: number[];
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen, onClose, onTaskChange, tags, onToggleTag,
  onSubmit, values, activeTaskCount, usedPriorityLevels,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !values.task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    setIsLoading(true);
    try { await onSubmit(e); } finally { setIsLoading(false); }
  };

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-custom">
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-[1.25rem] border-b border-border-subtle"
          style={{ backgroundColor: 'var(--tm-surface)' }}
        >
          <h2 className="text-xl font-bold text-text-primary">Edit Task</h2>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <TaskFormFields
            values={values.task as TaskFormData}
            onChange={next => onTaskChange({ ...values.task!, ...next } as Task)}
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
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
