'use client';

import React, { useState } from 'react';
import { Newspaper, RefreshCw, CalendarCheck, SkipForward, ChartArea, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchTaskDebrief, TaskDebrief } from '@/app/lib/backend-api';

type Status = 'idle' | 'loading' | 'done' | 'error';

const TaskDebriefPanel: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [debrief, setDebrief] = useState<TaskDebrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <div className="card mb-4 sm:mb-6">
      <div className="flex items-center justify-between p-4 sm:p-5">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2 flex-1"
        >
          <Newspaper className="w-5 h-5" style={{ color: 'var(--tm-accent)' }} />
          <h2 className="text-base font-semibold text-text-primary">Daily Debrief</h2>
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
          <button onClick={() => setOpen(prev => !prev)}>
            {open ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">

          {status === 'idle' && (
            <p className="text-sm text-text-secondary text-center py-3">
              Get an execution-order action plan, upcoming spike warnings, and a workload feasibility verdict for your tasks.
            </p>
          )}

          {status === 'loading' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="rounded-lg p-3 space-y-2 animate-pulse"
                  style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
                >
                  <div className="h-3.5 rounded w-1/2" style={{ backgroundColor: 'var(--tm-border)' }} />
                  <div className="h-2.5 rounded" style={{ backgroundColor: 'var(--tm-border)' }} />
                  <div className="h-2.5 rounded w-5/6" style={{ backgroundColor: 'var(--tm-border)' }} />
                  <div className="h-2.5 rounded w-4/6" style={{ backgroundColor: 'var(--tm-border)' }} />
                </div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm py-2" style={{ color: 'var(--tm-danger)' }}>{error}</p>
          )}

          {status === 'done' && debrief && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DebriefSection
                icon={<CalendarCheck className="w-4 h-4" />}
                title="Today's Focus"
                text={debrief.today_action_plan}
              />
              <DebriefSection
                icon={<SkipForward className="w-4 h-4" />}
                title="Coming Up"
                text={debrief.future_horizon_warning}
              />
              <DebriefSection
                icon={<ChartArea className="w-4 h-4" />}
                title="Today's Load"
                text={debrief.workload_analysis}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function toSentences(text: string): string[] {
  // \d\.\d is tried first so decimal points (e.g. 3.5, 22.0) are consumed
  // as a unit and never treated as sentence boundaries.
  return text.match(/(?:\d\.\d|[^.!?])+[.!?]["']?/g)?.map(s => s.trim()).filter(Boolean) ?? [text];
}

function DebriefSection({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  const sentences = toSentences(text);
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: 'var(--tm-surface-raised)', border: '1px solid var(--tm-border)' }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--tm-accent)' }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <ul className="space-y-1">
        {sentences.map((s, i) => (
          <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-text-secondary">
            <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--tm-accent)' }} />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskDebriefPanel;
