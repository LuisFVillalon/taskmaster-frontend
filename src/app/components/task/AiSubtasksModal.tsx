import React, { useState } from 'react';
import { X, Loader2, AlertTriangle, Trash2, LayoutList, Calendar, Timer } from 'lucide-react';
import { Task } from '@/app/types/task';
import { AiSubtask } from '@/app/lib/backend-api';

interface AiSubtasksModalProps {
  isOpen: boolean;
  parentTask: Task;
  subtasks: AiSubtask[];
  overloadWarning: string | null;
  onSave: (subtasks: AiSubtask[]) => Promise<void>;
  onDiscard: () => void;
}

const AiSubtasksModal: React.FC<AiSubtasksModalProps> = ({
  isOpen,
  parentTask,
  subtasks: initialSubtasks,
  overloadWarning,
  onSave,
  onDiscard,
}) => {
  const [subtasks, setSubtasks] = useState<AiSubtask[]>(initialSubtasks);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleDelete = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(subtasks);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="modal-panel max-w-xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-[1.25rem] border-b border-border-subtle flex-shrink-0"
          style={{ backgroundColor: 'var(--tm-surface)' }}
        >
          <div className="flex items-center gap-2">
            <LayoutList className="w-5 h-5" style={{ color: 'var(--tm-accent)' }} />
            <div>
              <h2 className="text-lg font-bold text-text-primary">Smart Plan</h2>
              <p className="text-xs text-text-muted truncate max-w-[280px]"><span className="font-bold">Goal:</span> {parentTask.title}</p>
            </div>
          </div>
          <button onClick={onDiscard} className="btn btn-ghost" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4 scrollbar-custom">
          {/* Overload warning */}
          {overloadWarning && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <p style={{ color: '#d97706' }}>{overloadWarning}</p>
            </div>
          )}

          {/* Intro copy */}
          <p className="text-sm text-text-secondary">
            {subtasks.length === 0
              ? "All subtasks removed. Save to stick with just the main goal, or Discard to cancel."
              : `Your smart plan is ready with ${subtasks.length} step${subtasks.length === 1 ? '' : 's'} to crush your goal. Drop what you don't need, then hit save.`}
          </p>

          {/* Subtask list */}
          <div className="space-y-3">
            {subtasks.map((subtask, index) => (
              <div
                key={index}
                className="group flex gap-3 p-4 rounded-xl border"
                style={{ backgroundColor: 'var(--tm-surface-raised)', borderColor: 'var(--tm-border)' }}
              >
                {/* Step number */}
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
                >
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary leading-snug">{subtask.title}</p>
                  {subtask.description && (
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">{subtask.description}</p>
                  )}
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {subtask.due_date && (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        Due {formatDate(subtask.due_date)}
                        {subtask.due_time && <> at {formatTime(subtask.due_time)}</>}
                      </span>
                    )}
                    {subtask.estimated_time != null && (
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Timer className="w-3 h-3 flex-shrink-0" />
                        Est. {subtask.estimated_time}h
                      </span>
                    )}
                  </div>
                  {/* Tags */}
                  {subtask.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {subtask.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100"
                  style={{ color: 'var(--tm-danger)' }}
                  aria-label="Remove subtask"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-6 py-4 border-t border-border-subtle flex-shrink-0 rounded-b-[1.25rem]"
          style={{ backgroundColor: 'var(--tm-surface)' }}
        >
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="btn btn-secondary flex-1 py-2.5"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary flex-1 py-2.5"
          >
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : subtasks.length === 0 ? 'Finish' : `Save Smart Plan (${subtasks.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiSubtasksModal;
