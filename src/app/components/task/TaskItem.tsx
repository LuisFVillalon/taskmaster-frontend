import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Trash2, Calendar, SquareArrowUpRight } from 'lucide-react';
import { Task } from '@/app/types/task';
import {
  getDueColor,
  getDurationColor,
  formatTime12Hour,
  formatDueDate,
  PRIORITY_COLORS,
} from '@/app/utils/taskUtils';
import { toLocalDateStr, toLocalTimeStr } from '@/app/utils/dateUtils';
import PriorityPicker from './PriorityPicker';
import TaskTags from './TaskTags';

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

  const availablePriorities = React.useMemo(() => {
    const max = activeTaskCount ?? Object.keys(PRIORITY_COLORS).length;
    const takenByOthers = occupiedPriorities.filter(p => p !== task.priority);
    return Array.from({ length: max }, (_, i) => i + 1).filter(
      p => !takenByOthers.includes(p)
    );
  }, [activeTaskCount, occupiedPriorities, task.priority]);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);

  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const computed = window.getComputedStyle(el);
      const lineHeight = parseFloat(computed.lineHeight);
      setDescriptionOverflows(el.scrollHeight > lineHeight * 2 + 1);
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

  const normalizedDueDate: string | null =
    task.due_date instanceof Date ? toLocalDateStr(task.due_date) : (task.due_date ?? null);

  const normalizedDueTime: string | null =
    task.due_time instanceof Date ? toLocalTimeStr(task.due_time) : (task.due_time ?? null);

  // Recolor the semantic status classes from taskUtils into the notebook's
  // ink palette instead of raw tailwind red/green/yellow, which clash with
  // the kraft/cream theme.
  const toInkTone = (classes: string) => {
    if (classes.includes('red')) return 'text-[var(--tm-accent-2)]';
    if (classes.includes('yellow')) return 'text-[var(--tm-accent)]';
    if (classes.includes('green')) return 'text-[var(--tm-success)]';
    return 'text-text-muted';
  };

  if (compact) {
    return (
      <div
        className={`card px-3 py-2 animate-fade-in ${task.completed ? 'opacity-75' : ''}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onToggleComplete?.(task.id)}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            className={`flex-shrink-0 w-4 h-4  border-2 flex items-center justify-center transition-all active:scale-90 ${
              task.completed
                ? 'border-[var(--tm-success)] bg-[var(--tm-success)]'
                : 'border-border hover:border-accent'
            }`}
          >
            {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
          </button>

          <span
            className={`flex-1 min-w-0 text-sm font-semibold truncate ${
              task.completed ? 'line-through text-text-muted' : 'text-text-primary'
            }`}
          >
            {task.title}
          </span>

          <PriorityPicker
            priority={task.priority}
            maxPriority={maxPriority}
            availablePriorities={availablePriorities}
            onSelect={(priority) => onUpdatePriority?.(task.id, priority)}
            size="sm"
          />

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

        <TaskTags tags={task.tags} allTags={tags} className="mt-1.5 pl-6" />
      </div>
    );
  }

  return (
    <div
      className={`card p-4 sm:p-6 animate-fade-in ${task.completed ? 'opacity-75' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          onClick={() => onToggleComplete?.(task.id)}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          className={`mt-0.5 sm:mt-1 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6  border-2 flex items-center justify-center transition-all active:scale-90 ${
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
                task.completed ? 'text-text-muted line-through' : 'text-text-primary'
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

              <PriorityPicker
                priority={task.priority}
                maxPriority={maxPriority}
                availablePriorities={availablePriorities}
                onSelect={(priority) => onUpdatePriority?.(task.id, priority)}
                size="md"
              />

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
            <div className="relative mb-3 pl-3 border-l-2 border-border-subtle">
              <p
                ref={descriptionRef}
                className={`text-xs sm:text-sm leading-relaxed ${
                  !isDescriptionExpanded ? 'line-clamp-2 pr-20' : ''
                } ${
                  task.completed ? 'line-through text-text-muted' : 'text-text-secondary'
                }`}
              >
                {task.description}
              </p>

              {descriptionOverflows && !isDescriptionExpanded && (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded(true)}
                  className="absolute bottom-0 right-0 pl-2 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-colors bg-surface"
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
          )}

          <TaskTags tags={task.tags} allTags={tags} className="mb-3" />

          <div className="pt-3 border-t border-border-subtle flex items-center gap-5 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className={`w-3.5 h-3.5 ${toInkTone(getDueColor(task.due_date))}`} />
              <span className={toInkTone(getDueColor(task.due_date))}>
                {formatDueDate(normalizedDueDate, normalizedDueTime ?? undefined)}
                {normalizedDueTime && (
                  <span className="text-text-muted">
                    {' · '}
                    {formatTime12Hour(typeof task.due_time === 'string' ? task.due_time : null)}
                  </span>
                )}
              </span>
            </div>

            {task.estimated_time != null && (
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${toInkTone(getDurationColor(Number(task.estimated_time)))}`} />
                <span className={toInkTone(getDurationColor(Number(task.estimated_time)))}>
                  {task.estimated_time} hrs
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
