'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, Save, Trash2, CheckSquare, Rocket
} from 'lucide-react';
import { Task, Tag, EditTaskForm, TaskCategory } from '@/app/types/task';
import { toLocalISOString } from '@/app/utils/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskDetailProps {
  task: Task | null;
  allTags: Tag[];
  onUpdate: (id: number, changes: EditTaskForm) => Promise<boolean>;
  onDelete: (task: Task) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activeTaskCount: number;
  usedPriorityLevels: number[];
  isNewTask?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


function toDateInput(val: string | Date | null): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string' && val.length >= 10) return val.slice(0, 10);
  return '';
}

function toTimeInput(val: string | Date | null): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(11, 16);
  if (typeof val === 'string' && val.includes(':')) return val.slice(0, 5);
  return '';
}

// ─── TaskDetail ───────────────────────────────────────────────────────────────

const TaskDetail: React.FC<TaskDetailProps> = ({
  task, allTags, onUpdate, onDelete, sidebarOpen, onToggleSidebar,
  activeTaskCount, usedPriorityLevels, isNewTask = false,
}) => {
  const [title, setTitle]                 = useState('');
  const [description, setDescription]     = useState('');
  const [dueDate, setDueDate]             = useState('');
  const [dueTime, setDueTime]             = useState('');
  const [priority, setPriority]           = useState('');
  const [category, setCategory]           = useState<TaskCategory | ''>('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [completed, setCompleted]         = useState(false);
  const [sessionType, setSessionType]     = useState<'bite_size' | 'deep_work' | null>(null);
  const [tagsOpen, setTagsOpen]           = useState(false);
  const [advancedOpen, setAdvancedOpen]   = useState(false);
  const [activeTags, setActiveTags]       = useState<Tag[]>([]);
  const [saveStatus, setSaveStatus]       = useState<'idle' | 'saved'>('idle');

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when the selected task changes
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description);
    setDueDate(toDateInput(task.due_date));
    setDueTime(toTimeInput(task.due_time));
    setPriority(task.priority !== null && task.priority !== undefined ? String(task.priority) : '');
    setCategory((task.category as TaskCategory | null | undefined) ?? '');
    setEstimatedTime(task.estimated_time ?? null);
    setSessionType(task.session_type ?? null);
    setCompleted(task.completed);
    setActiveTags(task.tags ?? []);
    setSaveStatus('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  useEffect(() => {
    return () => {
      if (saveTimer.current)  clearTimeout(saveTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  // ── Debounced auto-save ────────────────────────────────────────────────────

  const scheduleAutoSave = (overrides: Partial<{
    title: string; description: string; dueDate: string; dueTime: string;
    priority: string; category: TaskCategory | ''; completed: boolean; activeTags: Tag[];
    estimatedTime: number | null; sessionType: 'bite_size' | 'deep_work' | null;
  }> = {}) => {
    if (!task) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const t  = overrides.title         ?? title;
      const d  = overrides.description   ?? description;
      const dd = overrides.dueDate       ?? dueDate;
      const dt = overrides.dueTime       ?? dueTime;
      const p  = overrides.priority      ?? priority;
      const c  = overrides.category      ?? category;
      const co = overrides.completed     ?? completed;
      const tg = overrides.activeTags    ?? activeTags;
      const et = overrides.estimatedTime !== undefined ? overrides.estimatedTime : estimatedTime;
      const st = overrides.sessionType   !== undefined ? overrides.sessionType   : sessionType;

      const form: EditTaskForm = {
        id: task.id,
        title: t,
        description: d,
        due_date: dd || null,
        due_time: dt || null,
        priority: p ? Number(p) : null,
        category: (c as TaskCategory) || null,
        completed: co,
        completed_date: co
          ? (task.completed_date ?? toLocalISOString(new Date()))
          : null,
        tags: tg,
        created_date: task.created_date,
        estimated_time: et,
        session_type: st,
        parent_task_id: task.parent_task_id ?? null,
      };
      onUpdate(task.id, form);
    }, 600);
  };

  // ── Manual save ───────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!task) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    const form: EditTaskForm = {
      id: task.id,
      title,
      description,
      due_date: dueDate || null,
      due_time: dueTime || null,
      priority: priority ? Number(priority) : null,
      category: (category as TaskCategory) || null,
      completed,
      completed_date: completed
        ? (task.completed_date ?? toLocalISOString(new Date()))
        : null,
      tags: activeTags,
      created_date: task.created_date,
      estimated_time: estimatedTime,
      session_type: sessionType,
      parent_task_id: task.parent_task_id ?? null,
    };

    onUpdate(task.id, form).then(ok => {
      if (!ok) return;
      setSaveStatus('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
    });
  };

  // ── Tag toggle ────────────────────────────────────────────────────────────

  const handleTagToggle = (tag: Tag) => {
    const next = activeTags.some(t => t.id === tag.id)
      ? activeTags.filter(t => t.id !== tag.id)
      : [...activeTags, tag];
    setActiveTags(next);
    scheduleAutoSave({ activeTags: next });
  };

  // ── Completion toggle ─────────────────────────────────────────────────────

  const handleCompletedChange = (val: boolean) => {
    setCompleted(val);
    scheduleAutoSave({ completed: val });
  };

  // ── Empty / no-task state ─────────────────────────────────────────────────

  if (!task) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--tm-surface)' }}>
        <div
          className="hidden sm:flex items-center gap-0.5 px-4 py-2 border-b border-border-subtle shrink-0"
          style={{ backgroundColor: 'var(--tm-surface-raised)' }}
        >
          <button
            type="button"
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="flex px-2 py-1.5  text-sm transition-colors"
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
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16  flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--tm-surface-raised)' }}
            >
              <CheckSquare className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-base font-semibold text-text-muted mb-1">No task selected</h3>
            <p className="text-sm text-text-muted">Select a task from the sidebar or create a new one</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ backgroundColor: 'var(--tm-surface)' }}>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-0.5 px-4 py-2 border-b border-border-subtle flex-wrap"
        style={{ backgroundColor: 'var(--tm-surface-raised)' }}
      >
        {/* Sidebar toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="hidden sm:flex px-2 py-1.5  text-sm transition-colors"
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

        {/* Completed toggle in toolbar */}
        <button
          type="button"
          onClick={() => handleCompletedChange(!completed)}
          className="flex items-center gap-1.5 px-3 py-1.5  text-sm font-medium transition-colors"
          style={completed ? {
            backgroundColor: 'var(--tm-success-subtle)',
            color: 'var(--tm-success)',
          } : {
            color: 'var(--tm-text-secondary)',
          }}
          onMouseEnter={e => {
            if (!completed) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-surface-raised)';
          }}
          onMouseLeave={e => {
            if (!completed) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
          }}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden sm:inline">{completed ? 'Completed' : 'Mark complete'}</span>
        </button>

        {/* Right-side actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(task)}
            title="Delete task"
            className="flex items-center gap-1.5 px-3 py-1.5  text-sm font-medium transition-colors"
            style={{ color: 'var(--tm-text-secondary)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--tm-danger-subtle)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--tm-danger)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--tm-text-secondary)';
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className="btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium "
            style={saveStatus === 'saved' ? {
              backgroundColor: 'var(--tm-success-subtle)',
              color: 'var(--tm-success)',
            } : {
              backgroundColor: 'var(--tm-accent)',
              color: 'var(--tm-accent-text)',
            }}
          >
            {saveStatus === 'saved' ? (
              'Saved ✓'
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-custom">

        {/* ── Title ──────────────────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 pt-6 pb-2">
          <input
            type="text"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              scheduleAutoSave({ title: e.target.value });
            }}
            placeholder="Untitled Task*"
            className="w-full text-2xl sm:text-3xl font-bold text-text-primary placeholder-text-muted focus:outline-none bg-transparent"
          />
        </div>

        {/* ── Tag picker (collapsible) ─────────────────────────────────────── */}
        {allTags.length > 0 && (
          <div className="px-6 sm:px-10 pb-3">
            <button
              type="button"
              onClick={() => setTagsOpen(v => !v)}
              aria-expanded={tagsOpen}
              aria-controls="task-tag-picker"
              className="flex items-center gap-1.5 text-xs font-medium mb-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--tm-text-muted)' }}
            >
              {tagsOpen
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />}
              {tagsOpen ? 'Hide tags' : (
                activeTags.length > 0
                  ? (
                    <span className="flex items-center gap-1.5">
                      <span>Tags</span>
                      {activeTags.slice(0, 5).map(t => (
                        <span
                          key={t.id}
                          className="inline-block w-2 h-2  flex-shrink-0"
                          style={{ backgroundColor: t.color }}
                          title={t.name}
                        />
                      ))}
                      {activeTags.length > 5 && <span>+{activeTags.length - 5}</span>}
                    </span>
                  )
                  : 'Add tags'
              )}
            </button>

            <div
              id="task-tag-picker"
              role="region"
              aria-label="Tag picker"
              className="overflow-hidden transition-all duration-200"
              style={{ maxHeight: tagsOpen ? '160px' : '0px', opacity: tagsOpen ? 1 : 0 }}
            >
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4  border border-border max-h-36 overflow-y-auto scrollbar-custom"
                style={{ backgroundColor: 'var(--tm-surface-raised)' }}
              >
                {allTags.map(tag => {
                  const selected = activeTags.some(t => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      style={{
                        backgroundColor: selected ? tag.color : 'var(--tm-surface)',
                        color: selected ? '#ffffff' : 'var(--tm-text-primary)',
                        border: `1px solid ${selected ? tag.color : 'var(--tm-border)'}`,
                        transform: selected ? 'scale(1)' : 'scale(0.97)',
                      }}
                      className="px-3 py-2  text-sm font-medium transition-all hover:scale-100 active:scale-95"
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mx-6 sm:mx-10 border-t border-border-subtle" />

        {/* ── Detail fields ───────────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 py-5 flex flex-col gap-5">

          {/* Advanced Fields (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setAdvancedOpen(v => !v)}
              aria-expanded={advancedOpen}
              className="flex items-center gap-1.5 text-xs font-medium mb-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--tm-text-muted)' }}
            >
              {advancedOpen
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />}
              Advanced fields 
              <Rocket className="w-3.5 h-3.5"/>
            </button>

            <div
              className="overflow-hidden transition-all duration-200"
              style={{ maxHeight: advancedOpen ? '800px' : '0px', opacity: advancedOpen ? 1 : 0 }}
            >
              <div className="flex flex-col gap-4 pt-1">

                {/* Category — only shown for new tasks */}
                {isNewTask && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={e => {
                        const val = e.target.value as TaskCategory | '';
                        setCategory(val);
                        scheduleAutoSave({ category: val });
                      }}
                      className="w-full input-field text-sm"
                    >
                      <option value="">No category</option>
                      <option value="homework">Homework</option>
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={estimatedTime ?? ''}
                      onChange={e => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        setEstimatedTime(val);
                        scheduleAutoSave({ estimatedTime: val });
                      }}
                      placeholder="e.g. 2.5"
                      className="w-full input-field text-sm"
                    />
                    <p className="text-xs text-text-muted mt-1">Increments of 0.5 hours</p>
                  </div>

                  {/* Session Type */}
                  {isNewTask && <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                      Session Type
                    </label>
                    <div className="flex flex-col gap-2">
                      {([
                        { value: 'bite_size' as const, label: 'Bite-sized steps', sub: '15–30 min per task' },
                        { value: 'deep_work' as const, label: 'Deep work sessions', sub: '1–2 hours per task' },
                      ] as const).map(opt => {
                        const selected = (sessionType ?? null) === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const next = selected ? null : opt.value;
                              setSessionType(next);
                              scheduleAutoSave({ sessionType: next });
                            }}
                            className="flex flex-col items-start gap-0.5 p-2.5  border text-left transition-all"
                            style={{
                              borderColor: selected ? 'var(--tm-accent)' : 'var(--tm-border)',
                              backgroundColor: selected ? 'var(--tm-accent-subtle)' : 'var(--tm-surface-raised)',
                            }}
                          >
                            <span
                              className="text-xs font-semibold"
                              style={{ color: selected ? 'var(--tm-accent)' : 'var(--tm-text-primary)' }}
                            >
                              {opt.label}
                            </span>
                            <span className="text-xs text-text-muted">{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>}
                </div>

              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Priority
            </label>
            {(() => {
              const currentPriority = task.priority;
              const occupied = new Set(usedPriorityLevels.filter(p => p !== currentPriority));
              const maxPriority = Math.max(activeTaskCount, currentPriority ?? 0);
              const availablePriorities = Array.from({ length: maxPriority }, (_, i) => i + 1)
                .filter(p => p === currentPriority || !occupied.has(p));
              return (
                <>
                  <select
                    value={priority}
                    onChange={e => {
                      setPriority(e.target.value);
                      scheduleAutoSave({ priority: e.target.value });
                    }}
                    className="w-full input-field text-sm"
                  >
                    <option value="">No priority</option>
                    {availablePriorities.map(p => (
                      <option key={p} value={String(p)}>{p}</option>
                    ))}
                  </select>
                  <p className="text-xs text-text-muted mt-1">
                    1 = highest priority. Available: {availablePriorities.length > 3
                      ? `${availablePriorities[0]}, ..., ${availablePriorities[availablePriorities.length - 1]}`
                      : availablePriorities.join(', ')}.
                  </p>
                </>
              );
            })()}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                scheduleAutoSave({ description: e.target.value });
              }}
              placeholder="Add a description…"
              rows={4}
              className="w-full input-field resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Due Date + Due Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value);
                  scheduleAutoSave({ dueDate: e.target.value });
                }}
                className="w-full input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={e => {
                  setDueTime(e.target.value);
                  scheduleAutoSave({ dueTime: e.target.value });
                }}
                className="w-full input-field text-sm"
              />
            </div>
          </div>

          {/* Created date (read-only meta) */}
          {task.created_date && (
            <p className="text-xs text-text-muted">
              Created{' '}
              {new Date(task.created_date).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
