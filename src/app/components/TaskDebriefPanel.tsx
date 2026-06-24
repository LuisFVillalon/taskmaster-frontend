'use client';

import React, { useState, useEffect } from 'react';
import { Newspaper, RefreshCw, AlertTriangle, CalendarCheck, Zap, Repeat2, SkipForward, ChartArea, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { fetchTaskDebrief, TaskDebrief } from '@/app/lib/backend-api';

type Status = 'idle' | 'loading' | 'done' | 'error';

function splitFutureHorizon(items: unknown): { comingUp: string[]; earlyStart: string[] } {
  const list: string[] = Array.isArray(items)
    ? (items as unknown[]).map(String).filter(Boolean)
    : (items && typeof items === 'string' ? [String(items)] : []);
  const headerIdx = list.findIndex(s => /get an early start on:/i.test(s));
  if (headerIdx === -1) return { comingUp: list, earlyStart: [] };
  return { comingUp: list.slice(0, headerIdx), earlyStart: list.slice(headerIdx + 1) };
}

const TaskDebriefPanel: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [debrief, setDebrief] = useState<TaskDebrief | null>(null);
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
              Get an execution-order action plan, upcoming spike warnings, and a workload feasibility verdict for your tasks.
            </p>
          )}

          {status === 'loading' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[4, 5, 6].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm py-2" style={{ color: 'var(--tm-danger)' }}>{error}</p>
          )}

          {status === 'done' && debrief && (() => {
            const { comingUp, earlyStart } = splitFutureHorizon(debrief.future_horizon_warning);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <DebriefSection
                    icon={<AlertTriangle className="w-4 h-4" />}
                    title="Overdue Tasks"
                    items={debrief.overdue_tasks}
                    accentColor="#dc2626"
                  />
                  <DebriefSection
                    icon={<CalendarCheck className="w-4 h-4" />}
                    title="Due Today"
                    items={debrief.tasks_due_today}
                    accentColor="#16a34a"
                  />
                  <DebriefSection
                    icon={<Zap className="w-4 h-4" />}
                    title="Task Recommendations"
                    items={debrief.task_recommendations}
                  />
                  <DebriefSection
                    icon={<Repeat2 className="w-4 h-4" />}
                    title="Remaining Habits"
                    items={debrief.remaining_habits}
                    accentColor="#9333ea"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DebriefSection
                    icon={<SkipForward className="w-4 h-4" />}
                    title="Coming Up"
                    items={comingUp}
                  />
                  <DebriefSection
                    icon={<Star className="w-4 h-4" />}
                    title="Get an Early Start On"
                    items={earlyStart}
                    accentColor="#eab308"
                  />
                  <DebriefSection
                    icon={<ChartArea className="w-4 h-4" />}
                    title="Today's Load"
                    items={debrief.workload_analysis}
                    accentColor="#f97316"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

function SkeletonCard() {
  return (
    <div
      className="rounded-lg p-3 space-y-2 animate-pulse"
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="h-3.5 rounded w-1/2" style={{ backgroundColor: 'var(--tm-border)' }} />
      <div className="h-2.5 rounded" style={{ backgroundColor: 'var(--tm-border)' }} />
      <div className="h-2.5 rounded w-5/6" style={{ backgroundColor: 'var(--tm-border)' }} />
      <div className="h-2.5 rounded w-4/6" style={{ backgroundColor: 'var(--tm-border)' }} />
    </div>
  );
}

function DebriefSection({ icon, title, items, accentColor }: { icon: React.ReactNode; title: string; items: unknown; accentColor?: string }) {
  const accent = accentColor ?? 'var(--tm-accent)';
  const safeItems: string[] = Array.isArray(items)
    ? (items as unknown[]).map(String)
    : (items && typeof items === 'string' ? [items] : []);

  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color: accent }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <ul className="space-y-1">
        {safeItems.map((item, i) => (
          <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-text-secondary">
            <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: accent }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskDebriefPanel;
