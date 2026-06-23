import React, { useState } from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';
import { Tag, TaskCategory } from '@/app/types/task';

export interface TaskFormData {
  title: string;
  description: string;
  priority: number | null;
  due_date: string | Date | null;
  due_time: string | Date | null;
  tags: Tag[];
  category?: string | null;
  estimated_time?: number | null;
  complexity?: number | null;
}

interface TaskFormFieldsProps {
  values: TaskFormData;
  onChange: (next: TaskFormData) => void;
  tags: Tag[];
  onToggleTag: (tag: Tag) => void;
  activeTaskCount: number;
  usedPriorityLevels: number[];
  /** When true the category field appears and advanced fields become required. */
  showCategory?: boolean;
  /** Forces the advanced section open (e.g. when AI mode is active). */
  forceAdvancedOpen?: boolean;
}

const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  values,
  onChange,
  tags,
  onToggleTag,
  activeTaskCount,
  usedPriorityLevels,
  showCategory = false,
  forceAdvancedOpen = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isAIMode = showCategory && !!values.category;
  const advancedOpen = showAdvanced || forceAdvancedOpen || isAIMode;

  const occupiedPriorities = new Set(
    usedPriorityLevels.filter(p => p !== values.priority),
  );
  const maxPriority = Math.max(activeTaskCount, values.priority ?? 0);
  const priorityRange = Array.from({ length: maxPriority || activeTaskCount + 1 }, (_, i) => i + 1);
  const availablePriorities = priorityRange.filter(
    p => p === values.priority || !occupiedPriorities.has(p),
  );

  const set = (patch: Partial<TaskFormData>) => onChange({ ...values, ...patch });

  const dueDateValue =
    values.due_date instanceof Date
      ? values.due_date.toISOString().slice(0, 10)
      : typeof values.due_date === 'string'
      ? values.due_date
      : '';

  const dueTimeValue =
    values.due_time instanceof Date
      ? values.due_time.toISOString().slice(11, 16)
      : values.due_time ?? '';

  return (
    <>
      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Priority</label>
        <select
          value={values.priority ?? ''}
          onChange={e => set({ priority: e.target.value === '' ? null : parseInt(e.target.value) })}
          className="input-field"
        >
          <option value="">No priority</option>
          {availablePriorities.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <p className="text-xs text-text-muted mt-1">
          1 = highest priority. Leave blank for no priority.
          {availablePriorities.length > 0 && ` Available: ${availablePriorities.join(', ')}.`}
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Title <span style={{ color: 'var(--tm-danger)' }}>*</span>
        </label>
        <input
          type="text"
          required
          value={values.title}
          onChange={e => set({ title: e.target.value })}
          placeholder="Enter task title"
          className="input-field"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
        <textarea
          value={values.description}
          onChange={e => set({ description: e.target.value })}
          placeholder="Add task details…"
          rows={3}
          className="input-field resize-none"
        />
      </div>

      {/* Due Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Due Date{isAIMode && <span style={{ color: 'var(--tm-danger)' }}>*</span>}
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="date"
              required={isAIMode}
              value={dueDateValue}
              onChange={e => set({ due_date: e.target.value })}
              className="input-field pl-10"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Due Time{isAIMode && <span style={{ color: 'var(--tm-danger)' }}>*</span>}
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
            <input
              type="time"
              required={isAIMode}
              value={dueTimeValue as string}
              onChange={e => set({ due_time: e.target.value })}
              className="input-field pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Tags</label>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 rounded-xl border border-border max-h-48 overflow-y-auto scrollbar-custom"
          style={{ backgroundColor: 'var(--tm-surface-raised)' }}
        >
          {tags.map(tag => {
            const selected = values.tags.some(t => t.id === tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggleTag(tag)}
                style={{
                  backgroundColor: selected ? tag.color : 'var(--tm-surface)',
                  color: selected ? '#ffffff' : 'var(--tm-text-primary)',
                  border: `1px solid ${selected ? tag.color : 'var(--tm-border)'}`,
                  transform: selected ? 'scale(1)' : 'scale(0.97)',
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-100 active:scale-95"
              >
                {tag.name}
              </button>
            );
          })}
        </div>
        {values.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-text-muted">Selected:</span>
            {values.tags.map(tag => (
              <span
                key={tag.id}
                className="chip px-2 rounded"
                style={{ backgroundColor: tags.find(t => t.id === tag.id)?.color ?? 'var(--tm-accent)', color: 'white' }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Fields */}
      <div className="my-[2%]">
        <button
          type="button"
          onClick={() => setShowAdvanced(prev => !prev)}
          className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ChevronDown
            className="w-4 h-4 transition-transform duration-200"
            style={{ transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
          Advanced Fields
          {isAIMode && (
            <span className="text-xs" style={{ color: 'var(--tm-accent)' }}>
              (required for AI mode)
            </span>
          )}
        </button>

        {advancedOpen && (
          <div className="mt-4 space-y-4">
            {/* Category — only shown when parent opts in */}
            {showCategory && (
              <div>
                <label className="block text-sm font-medium text-text-secondary">
                  Select a category to enable{' '}
                  <span style={{ color: 'var(--tm-accent)' }} className="font-semibold">AI Plan Mode</span>
                </label>
                <p className="text-xs text-text-muted mb-1">
                  (requires estimated hours, complexity, and due date)
                </p>
                {values.category && (
                  <p className="text-xs mb-1" style={{ color: 'var(--tm-warning)' }}>
                    The task&apos;s category cannot be changed once the AI smart plan is created.
                  </p>
                )}
                <select
                  value={values.category ?? ''}
                  onChange={e => set({ category: e.target.value === '' ? null : e.target.value as TaskCategory })}
                  className="input-field"
                >
                  <option value="">(none)</option>
                  <option value="homework">Homework Assignment</option>
                  <option value="test">Test</option>
                  <option value="project">Project</option>
                  <option value="interview">Interview</option>
                  <option value="skill">Skill</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Estimated Hours{isAIMode && <span style={{ color: 'var(--tm-danger)' }}>*</span>}
                </label>
                <input
                  type="number"
                  required={isAIMode}
                  min={0}
                  step={0.5}
                  value={values.estimated_time ?? 0}
                  onChange={e => set({ estimated_time: Number(e.target.value) || 0 })}
                  placeholder="e.g. 2.5"
                  className="input-field"
                />
                <p className="text-xs text-text-muted mt-1">Increments of 0.5 hours</p>
              </div>

              {/* Complexity slider */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Complexity{isAIMode && <span style={{ color: 'var(--tm-danger)' }}>*</span>}
                </label>
                <div className="relative">
                  <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--tm-border)' }} />
                  <div
                    className="absolute top-0 left-0 h-2 rounded-full transition-all"
                    style={{
                      width: `${(((values.complexity ?? 1) - 1) / 4) * 100}%`,
                      backgroundColor: 'var(--tm-accent)',
                    }}
                  />
                  <input
                    type="range"
                    min={1} max={5} step={1}
                    required={isAIMode}
                    value={values.complexity ?? 1}
                    onChange={e => set({ complexity: parseInt(e.target.value) })}
                    className="absolute top-0 left-0 w-full h-2 appearance-none bg-transparent cursor-pointer"
                    style={{ accentColor: 'var(--tm-accent)' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-2">
                  <span>Very Easy</span>
                  <span>Very Hard</span>
                </div>
                <div className="mt-3 flex justify-center">
                  <span
                    className="chip font-semibold text-sm px-3 py-1"
                    style={{ backgroundColor: 'var(--tm-accent-subtle)', color: 'var(--tm-accent)' }}
                  >
                    Level {values.complexity ?? 1}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TaskFormFields;
