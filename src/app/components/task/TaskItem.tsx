import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Trash2, Calendar, SquareArrowUpRight, Siren } from 'lucide-react';
import { Task } from '@/app/types/task';
import {
  getDueColor,
  getDurationColor,
  formatTime12Hour,
  formatDueDate,
  PRIORITY_COLORS,
} from '@/app/utils/taskUtils';

interface TaskItemProps {
  task: Task;
  index: number;
  onToggleComplete?: (id: number) => void;
  tags: Array<{ id: number; name: string; color: string }>;
  onDeleteTask?: (task: Task) => void;
  onUpdatePriority?: (id: number, priority: number | null) => void;
  activeTaskCount?: number;
  occupiedPriorities?: number[];
  compact?: boolean;
}

const PRIORITY_STOPS = [
  '#dc2626',
  '#ea580c',
  '#eab308',
  '#16a34a',
  '#2563eb',
  '#ffffff',
];

const interpolateColor = (c1: string, c2: string, t: number) => {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);

  const r1 = (a >> 16) & 255;
  const g1 = (a >> 8) & 255;
  const b1 = a & 255;

  const r2 = (b >> 16) & 255;
  const g2 = (b >> 8) & 255;
  const b2 = b & 255;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${bl})`;
};

const getPriorityStyle = (priority: number | null, maxPriority: number) => {
  if (priority == null) {
    return {
      bg: '#f3f4f6',
      text: '#6b7280',
    };
  }

  const normalized = maxPriority <= 1 ? 0 : (priority - 1) / (maxPriority - 1);

  const segmentCount = PRIORITY_STOPS.length - 1;
  const segment = Math.min(
    Math.floor(normalized * segmentCount),
    segmentCount - 1
  );

  const localT = (normalized - segment / segmentCount) * segmentCount;
  const bg = interpolateColor(
    PRIORITY_STOPS[segment],
    PRIORITY_STOPS[segment + 1],
    localT
  );

  return {
    bg,
    text: normalized > 0.72 ? '#111827' : '#ffffff',
  };
};

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  onToggleComplete,
  tags,
  onDeleteTask,
  onUpdatePriority,
  activeTaskCount,
  occupiedPriorities = [],
  compact = false,
}) => {
  const router = useRouter();

  const maxPriority = activeTaskCount ?? Object.keys(PRIORITY_COLORS).length;
  const priorityStyle = getPriorityStyle(task.priority, maxPriority);

  const availablePriorities = React.useMemo(() => {
    const max = activeTaskCount ?? Object.keys(PRIORITY_COLORS).length;
    const takenByOthers = occupiedPriorities.filter(p => p !== task.priority);
    return Array.from({ length: max }, (_, i) => i + 1).filter(
      p => !takenByOthers.includes(p)
    );
  }, [activeTaskCount, occupiedPriorities, task.priority]);

  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);

  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!showPriorityMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (
        priorityMenuRef.current &&
        !priorityMenuRef.current.contains(e.target as Node)
      ) {
        setShowPriorityMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPriorityMenu]);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const computed = window.getComputedStyle(el);
      const lineHeight = parseFloat(computed.lineHeight);
      const twoLineHeight = lineHeight * 2;

      setDescriptionOverflows(el.scrollHeight > twoLineHeight + 1);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);

    window.addEventListener('resize', checkOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [task.description]);

  const handlePrioritySelect = (priority: number | null) => {
    onUpdatePriority?.(task.id, priority);
    setShowPriorityMenu(false);
  };

  const priorityPicker = (iconSize: string) => (
    <div ref={priorityMenuRef} className="relative flex-shrink-0">
      <button
        onClick={() => setShowPriorityMenu(v => !v)}
        className={`chip font-bold flex items-center gap-1 transition-opacity hover:opacity-75 ${
          task.priority == null ? 'opacity-40' : ''
        }`}
        style={{
          backgroundColor: priorityStyle.bg,
          color: priorityStyle.text,
          padding: '0.1rem 0.45rem',
          borderRadius: '9px',
          fontSize: iconSize === 'sm' ? '9px' : '11px',
        }}
        title="Change priority"
        aria-label="Change priority"
      >
        <Siren className={iconSize === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        {task.priority ?? '—'}
      </button>

      {showPriorityMenu && (
        <div className="absolute z-50 top-full mt-1 right-0 card p-1.5 flex flex-col gap-1 shadow-lg min-w-[72px]">
          <div
            className={`flex flex-col gap-1 ${
              availablePriorities.length > 5
                ? 'max-h-40 overflow-y-auto scrollbar-custom pr-0.5'
                : ''
            }`}
          >
            {availablePriorities.map(p => {
              const s = getPriorityStyle(p, maxPriority);

              return (
                <button
                  key={p}
                  onClick={() => handlePrioritySelect(p)}
                  className="chip text-[10px] font-bold flex items-center gap-1 w-full justify-center hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: s.bg,
                    color: s.text,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  <Siren className="w-3 h-3" />
                  {p}
                </button>
              );
            })}
          </div>

          {task.priority != null && (
            <button
              onClick={() => handlePrioritySelect(null)}
              className="text-[10px] font-medium text-text-muted hover:text-text-primary transition-colors text-center pt-0.5"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );

  const normalizedDueDate: string | null =
    task.due_date instanceof Date
      ? task.due_date.toISOString()
      : task.due_date ?? null;

  const normalizedDueTime: string | null =
    task.due_time instanceof Date
      ? task.due_time.toISOString()
      : task.due_time ?? null;

  const tagChips = (pl: string) =>
    task.tags?.length > 0 && (
      <div className={`flex items-center gap-1.5 flex-wrap ${pl}`}>
        {task.tags.map((tagName, i) => {
          const tagData = tags.find(t => t.name === tagName.name);

          return (
            <span
              key={i}
              className="chip px-2 py-1"
              style={{
                backgroundColor: tagData?.color ?? 'var(--tm-accent)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {tagName.name}
            </span>
          );
        })}
      </div>
    );

  if (compact) {
    return (
      <div
        className={`card px-3 py-2 animate-fade-in ${
          task.completed ? 'opacity-75' : ''
        }`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggleComplete?.(task.id)}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
              task.completed
                ? 'border-[var(--tm-success)] bg-[var(--tm-success)]'
                : 'border-border hover:border-accent'
            }`}
          >
            {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
          </button>

          <span
            className={`flex-1 min-w-0 text-sm font-semibold truncate ${
              task.completed
                ? 'line-through text-text-muted'
                : 'text-text-primary'
            }`}
          >
            {task.title}
          </span>

          {priorityPicker('sm')}

          <button
            onClick={() => router.push(`/tasks?taskId=${task.id}`)}
            className="btn btn-ghost p-1 flex-shrink-0"
            title="Open task"
            aria-label="Open task"
          >
            <SquareArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDeleteTask?.(task)}
            className="btn btn-danger-ghost p-1 flex-shrink-0"
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {tagChips('mt-1.5 pl-6')}
      </div>
    );
  }

  return (
    <div
      className={`card p-4 sm:p-6 animate-fade-in ${
        task.completed ? 'opacity-75' : ''
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          onClick={() => onToggleComplete?.(task.id)}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className={`mt-0.5 sm:mt-1 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
            task.completed
              ? 'border-[var(--tm-success)] bg-[var(--tm-success)]'
              : 'border-border hover:border-accent'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 sm:gap-4 mb-1.5 sm:mb-2">
            <h3
              className={`text-base sm:text-lg font-semibold leading-snug ${
                task.completed
                  ? 'text-text-muted line-through'
                  : 'text-text-primary'
              }`}
            >
              {task.title}
            </h3>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {task.category && (
                <span
                  className="chip text-xs font-bold uppercase tracking-wide px-2.5 py-1"
                  style={{
                    backgroundColor: 'var(--tm-accent-subtle)',
                    color: 'var(--tm-accent)',
                  }}
                >
                  {task.category}
                </span>
              )}

              {priorityPicker('md')}

              <button
                onClick={() => router.push(`/tasks?taskId=${task.id}`)}
                className="btn btn-ghost p-1.5"
                title="Open task"
                aria-label="Open task"
              >
                <SquareArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDeleteTask?.(task)}
                className="btn btn-danger-ghost p-1.5"
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {task.description && (
            <div
              className="mb-3 rounded-lg px-3 py-2"
              style={{ backgroundColor: 'var(--tm-surface-raised)' }}
            >
              <div className="relative">
                <p
                  ref={descriptionRef}
                  className={`text-xs sm:text-sm leading-relaxed ${
                    !isDescriptionExpanded ? 'line-clamp-2 pr-20' : ''
                  } ${
                    task.completed
                      ? 'line-through text-text-muted'
                      : 'text-text-secondary'
                  }`}
                >
                  {task.description}
                </p>

                {descriptionOverflows && !isDescriptionExpanded && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(true)}
                    className="absolute bottom-0 right-0 pl-2 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors"
                    style={{ backgroundColor: 'var(--tm-surface-raised)' }}
                    aria-label="Expand task description"
                  >
                    See more
                  </button>
                )}

                {descriptionOverflows && isDescriptionExpanded && (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(false)}
                    className="mt-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Collapse task description"
                  >
                    See less
                  </button>
                )}
              </div>
            </div>
          )}

          {tagChips('mb-3')}

          <div className="pt-3 border-t border-border-subtle">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">
                  Due
                </p>
                <div
                  className={`flex flex-col gap-1 px-3 py-2 rounded-lg ${getDueColor(
                    task.due_date
                  )}`}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDueDate(
                        normalizedDueDate,
                        normalizedDueTime ?? undefined
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime12Hour(
                        typeof task.due_time === 'string'
                          ? task.due_time
                          : null
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">
                  Est. Duration
                </p>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getDurationColor(
                    Number(task.estimated_time)
                  )}`}
                >
                  <Clock className="w-4 h-4" />
                  <span>
                    {task.estimated_time != null
                      ? `${task.estimated_time} hrs`
                      : '--'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-1">
                  Created
                </p>
                <div
                  className="flex flex-col gap-1 px-3 py-2 rounded-lg text-text-secondary"
                  style={{ backgroundColor: 'var(--tm-surface-raised)' }}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(task.created_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(task.created_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;