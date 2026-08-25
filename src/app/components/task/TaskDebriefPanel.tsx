'use client';

import React, { useState, useEffect } from 'react';
import {
  Newspaper, RefreshCw, AlertTriangle, CalendarCheck, Repeat2, Gauge,
  ChevronDown, ChevronUp, CheckCircle2, Circle, Flame, Siren, TrendingUp, Moon,
} from 'lucide-react';
import { fetchTaskDebrief } from '@/app/lib/backend-api';
import { DailyDebriefReport, DebriefTaskItem, HabitDebriefStatus, FocusNextItem, WorkloadCapacity } from '@/app/types/debrief';
import { getPriorityStyle, formatDueDate } from '@/app/utils/taskUtils';

type Status = 'idle' | 'loading' | 'done' | 'error';

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const TaskDebriefPanel: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [debrief, setDebrief] = useState<DailyDebriefReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  const run = async () => {
    setStatus('loading');
    setError(null);
    try {
      const result = await fetchTaskDebrief();
      setDebrief(result);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate task debrief');
      setStatus('error');
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { run(); }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && status === 'idle') run();
  };

  return (
    <div className="card mb-4 sm:mb-6">
      <div className="flex items-center justify-between p-4 sm:p-5">
        <button
          onClick={toggle}
          className="flex items-center gap-2 flex-1"
        >
          <Newspaper className="w-5 h-5" style={{ color: 'var(--tm-accent)' }} />
          <h2 className="text-base font-semibold text-text-primary">Daily Brief</h2>
        </button>
        <div className="flex items-center gap-2">
          {(status === 'done' || status === 'error') && (
            <button
              onClick={run}
              title="Refresh debrief"
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--tm-surface-raised)] disabled:opacity-60"
              style={{ color: 'var(--tm-accent)' }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button onClick={toggle}>
            {open ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3">

          {status === 'idle' && (
            <p className="text-sm text-text-secondary text-center py-3">
              See what&apos;s overdue, due today, and next on deck — plus your habit streaks and today&apos;s workload capacity.
            </p>
          )}

          {status === 'loading' && (
            <div className="space-y-3">
              <SkeletonBar />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[0, 1, 2].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </div>
              <SkeletonBar tall />
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm py-2" style={{ color: 'var(--tm-danger)' }}>{error}</p>
          )}

          {status === 'done' && debrief && (
            <div className="space-y-3">
              <WorkloadCard workload={debrief.workload} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SectionCard
                  icon={<AlertTriangle className="w-4 h-4" />}
                  title="Overdue Tasks"
                  accentColor="var(--tm-danger)"
                  isEmpty={debrief.overdue_tasks.length === 0}
                  emptyText="Nothing overdue."
                >
                  {debrief.overdue_tasks.map(task => <TaskRow key={task.id} task={task} />)}
                </SectionCard>

                <SectionCard
                  icon={<CalendarCheck className="w-4 h-4" />}
                  title="Due Today"
                  accentColor="var(--tm-success)"
                  isEmpty={debrief.due_today_tasks.length === 0}
                  emptyText="Nothing due today."
                >
                  {debrief.due_today_tasks.map(task => <TaskRow key={task.id} task={task} />)}
                </SectionCard>

                <SectionCard
                  icon={<Repeat2 className="w-4 h-4" />}
                  title="Habit Tracker Status"
                  accentColor="var(--tm-accent-2)"
                  isEmpty={debrief.habit_status.length === 0}
                  emptyText="No habits tracked."
                >
                  {debrief.habit_status.map(habit => <HabitRow key={habit.id} habit={habit} />)}
                </SectionCard>
              </div>

              <FocusNextCard items={debrief.focus_next} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function SkeletonCard() {
  return (
    <div
      className="rounded-md p-3 space-y-2 animate-pulse"
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="h-3.5 rounded-sm w-1/2" style={{ backgroundColor: 'var(--tm-border)' }} />
      <div className="h-2.5 rounded-sm" style={{ backgroundColor: 'var(--tm-border)' }} />
      <div className="h-2.5 rounded-sm w-5/6" style={{ backgroundColor: 'var(--tm-border)' }} />
      <div className="h-2.5 rounded-sm w-4/6" style={{ backgroundColor: 'var(--tm-border)' }} />
    </div>
  );
}

function SkeletonBar({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`rounded-md p-3 animate-pulse ${tall ? 'space-y-2' : ''}`}
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="h-3.5 rounded-sm w-1/3 mb-2" style={{ backgroundColor: 'var(--tm-border)' }} />
      <div className="h-2.5 rounded-sm" style={{ backgroundColor: 'var(--tm-border)' }} />
      {tall && <div className="h-2.5 rounded-sm w-5/6" style={{ backgroundColor: 'var(--tm-border)' }} />}
    </div>
  );
}

function SectionCard({
  icon, title, accentColor, isEmpty, emptyText, children,
}: {
  icon: React.ReactNode;
  title: string;
  accentColor: string;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md p-3"
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color: accentColor }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      {isEmpty ? (
        <p className="text-xs text-text-muted py-1">{emptyText}</p>
      ) : (
        <ul>{children}</ul>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: DebriefTaskItem }) {
  const style = getPriorityStyle(task.priority);
  const due = formatDueDate(task.due_date, task.due_time);
  return (
    <li
      className="flex items-start justify-between gap-2 py-1 border-b last:border-b-0"
      style={{ borderColor: 'var(--tm-border-subtle)' }}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{task.title}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap text-[10px] text-text-muted">
          {task.due_date && <span>{due}</span>}
          {task.category && <span>· {task.category}</span>}
        </div>
      </div>
      {task.priority != null && (
        <span
          className="chip flex-shrink-0 font-bold"
          style={{ backgroundColor: style.bg, color: style.text, padding: '0.1rem 0.4rem', fontSize: '10px' }}
        >
          {task.priority}
        </span>
      )}
    </li>
  );
}

function HabitRow({ habit }: { habit: HabitDebriefStatus }) {
  return (
    <li
      className="flex items-center justify-between gap-2 py-1 border-b last:border-b-0"
      style={{ borderColor: 'var(--tm-border-subtle)' }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {habit.logged_today ? (
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--tm-success)' }} />
        ) : (
          <Circle className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
        )}
        <span className="text-xs font-medium text-text-primary truncate">{habit.title}</span>
      </div>
      {habit.current_streak > 0 && (
        <span
          className="flex items-center gap-0.5 text-[10px] font-semibold flex-shrink-0"
          style={{ color: 'var(--tm-warning)' }}
        >
          <Flame className="w-3 h-3" />
          {habit.current_streak}
        </span>
      )}
    </li>
  );
}

function WorkloadCard({ workload }: { workload: WorkloadCapacity }) {
  if (workload.is_rest_day) {
    return (
      <div
        className="rounded-md p-3 flex items-center gap-2"
        style={{ backgroundColor: 'var(--tm-accent-subtle)', border: '1px solid var(--tm-border)' }}
      >
        <Moon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--tm-accent)' }} />
        <span className="text-xs font-semibold text-text-primary">Rest day</span>
        <span className="text-xs text-text-secondary">— no workload scheduled today.</span>
      </div>
    );
  }

  const pct = workload.utilization_pct;
  const overCap = workload.is_overcommitted || (pct != null && pct > 100);
  const barPct = pct != null ? Math.min(Math.max(pct, 0), 100) : (workload.committed_minutes > 0 ? 100 : 0);
  const barColor = overCap ? 'var(--tm-danger)' : (pct != null && pct >= 70 ? 'var(--tm-warning)' : 'var(--tm-success)');

  return (
    <div
      className="rounded-md p-3"
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5" style={{ color: overCap ? 'var(--tm-danger)' : 'var(--tm-text-primary)' }}>
          <Gauge className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Workload &amp; Capacity</span>
        </div>
        {overCap && (
          <span
            className="chip text-[10px] font-bold"
            style={{ backgroundColor: 'var(--tm-danger-subtle)', color: 'var(--tm-danger)' }}
          >
            Overcommitted
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tm-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${barPct}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
          {formatMinutes(workload.committed_minutes)}
          {workload.available_minutes != null && ` / ${formatMinutes(workload.available_minutes)}`}
        </span>
      </div>
      {pct != null && (
        <p className="text-[11px] text-text-muted mt-1.5">
          {Math.round(pct)}% of today&apos;s capacity committed
        </p>
      )}
    </div>
  );
}

function FocusNextCard({ items }: { items: FocusNextItem[] }) {
  return (
    <div
      className="rounded-md p-3"
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--tm-accent)' }}>
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Focus Next</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted py-1">Nothing urgent — you&apos;re on top of it.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => <FocusNextRow key={item.task_id} item={item} />)}
        </div>
      )}
    </div>
  );
}

function FocusNextRow({ item }: { item: FocusNextItem }) {
  const style = getPriorityStyle(item.priority);
  const isHighPriority = item.reason === 'high_priority';

  return (
    <div
      className="flex items-center gap-3 rounded-md p-2.5"
      style={{ backgroundColor: 'var(--tm-surface)', border: '1px solid var(--tm-border)' }}
    >
      <span
        className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-full"
        style={{
          backgroundColor: isHighPriority ? 'var(--tm-danger-subtle)' : 'var(--tm-accent-subtle)',
          color: isHighPriority ? 'var(--tm-danger)' : 'var(--tm-accent)',
        }}
      >
        {isHighPriority ? <Siren className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-primary truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: isHighPriority ? 'var(--tm-danger)' : 'var(--tm-accent)' }}
          >
            {isHighPriority ? 'High priority' : 'Plan ahead'}
          </span>
          {item.due_date && (
            <span className="text-[10px] text-text-muted">· due {formatDueDate(item.due_date)}</span>
          )}
          {item.estimated_time != null && (
            <span className="text-[10px] text-text-muted">· {item.estimated_time} hrs</span>
          )}
        </div>
      </div>
      {item.priority != null && (
        <span
          className="chip flex-shrink-0 font-bold"
          style={{ backgroundColor: style.bg, color: style.text, padding: '0.1rem 0.4rem', fontSize: '10px' }}
        >
          {item.priority}
        </span>
      )}
    </div>
  );
}

export default TaskDebriefPanel;
