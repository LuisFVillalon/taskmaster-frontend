'use client';

import React from 'react';
import { Flame, SquareCheck, FileText, Timer, Clock } from 'lucide-react';
import type { DayData } from '@/app/hooks/useYearCalendarData';
import type { Task } from '@/app/types/task';
import { toLocalDateStr, toLocalTimeStr } from '@/app/utils/dateUtils';
import { formatTime12Hour } from '@/app/utils/taskUtils';
import { bucketByTag } from '@/app/utils/tagBucketing';
import TagChipList from '@/app/components/common/TagChipList';
import { CategoryDonutChart, CategoryBarsChart, WeekTrendLineChart, type ChartCategory, type DayPoint } from './DayCharts';

interface DaySummaryProps {
  date: Date;
  data: DayData | undefined;
  totalHabits: number;
  dayData: Map<string, DayData>;
  /** 'widget' = compact dashboard-card layout (lists | charts side by side, trend graph below); 'page' = full /calendar page layout. */
  variant?: 'page' | 'widget';
}

const fmtHours = (hours: number): string => (Number.isInteger(hours) ? `${hours}` : hours.toFixed(1));

const normalizedTime = (t: Task): string | null =>
  typeof t.due_time === 'string' ? t.due_time : t.due_time instanceof Date ? toLocalTimeStr(t.due_time) : null;

const hoursByTag = (tasks: Task[]): ChartCategory[] => bucketByTag(tasks, t => t.estimated_time ?? 0);

const DESCRIPTION_TRUNCATE_LENGTH = 80;
// Widget card is narrow, so a "long" description is capped much sooner —
// the goal is a single line, not a couple of wrapped lines like the page view.
const COMPACT_DESCRIPTION_TRUNCATE_LENGTH = 40;

function TaskDueItem({ task, compact = false }: { task: Task; compact?: boolean }) {
  const [expanded, setExpanded] = React.useState(false);
  const description = task.description?.trim() ?? '';
  const truncateLength = compact ? COMPACT_DESCRIPTION_TRUNCATE_LENGTH : DESCRIPTION_TRUNCATE_LENGTH;
  const isLong = description.length > truncateLength;
  const displayText = expanded || !isLong ? description : `${description.slice(0, truncateLength)}…`;

  return (
    <div className="p-2 rounded-md border border-border-subtle space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm font-medium truncate ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
          {task.title}
        </span>
        {task.estimated_time != null && (
          <span className="text-xs font-semibold text-text-muted flex-shrink-0">{fmtHours(task.estimated_time)}h</span>
        )}
      </div>
      {description && compact ? (
        <div className="space-y-0.5">
          <p className={`text-xs text-text-muted ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>{description}</p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="text-[11px] font-semibold text-[var(--tm-accent)] hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      ) : description && (
        <p className="text-xs text-text-muted whitespace-pre-wrap">
          {displayText}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(e => !e)}
              className="ml-1 text-[11px] font-semibold text-[var(--tm-accent)] hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TagChipList tags={task.tags} size="xs" />
        {normalizedTime(task) && (
          <span className="inline-flex items-center gap-1 text-[11px] text-text-muted flex-shrink-0">
            <Clock className="w-3 h-3" />
            {formatTime12Hour(normalizedTime(task))}
          </span>
        )}
      </div>
    </div>
  );
}

// Caps a section's list content to a fixed height with its own scrollbar so
// a day with a lot of habits/tasks/notes/bars can't stretch the widget card
// taller than the calendar card sitting next to it.
const ScrollBox: React.FC<{ maxHeight: number; children: React.ReactNode }> = ({ maxHeight, children }) => (
  <div className="overflow-y-auto scrollbar-custom pr-1" style={{ maxHeight }}>{children}</div>
);

const SummaryTile: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string; bg: string }> = ({
  icon, label, value, color, bg,
}) => (
  <div className="p-2.5 rounded-lg border border-border-subtle flex flex-col gap-0.5" style={{ backgroundColor: bg }}>
    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color }}>{icon}{label}</span>
    <span className="text-lg font-bold leading-none text-text-primary">{value}</span>
  </div>
);

// Full day-detail body (summary tiles, habit/task/note lists, charts) shared
// by the DayDetailModal (year-grid click) and DaySummaryPanel (carousel
// click) so both surfaces stay in sync when this content changes.
const DaySummary: React.FC<DaySummaryProps> = ({ date, data, totalHabits, dayData, variant = 'page' }) => {
  const habitsCompleted = data?.habitsCompleted ?? [];
  const tasksDue = data?.tasksDue ?? [];
  const notesEdited = data?.notesEdited ?? [];
  const estimatedHours = data?.estimatedHours ?? 0;

  const dateStr = toLocalDateStr(date);
  const dowMonFirst = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dowMonFirst);
  const weekDays: DayPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = toLocalDateStr(d);
    return { date: d, hours: dayData.get(ds)?.estimatedHours ?? 0, isSelected: ds === dateStr };
  });
  const weekEnd = weekDays[6].date;
  const rangeLabel = `Week of ${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const donutCategories = hoursByTag(tasksDue);
  const barCategories: ChartCategory[] = tasksDue
    .filter(t => (t.estimated_time ?? 0) > 0)
    .map(t => ({ label: t.title, value: t.estimated_time ?? 0, color: t.tags[0]?.color ?? 'var(--tm-accent)' }))
    .sort((a, b) => b.value - a.value);

  const compact = variant === 'widget';
  const wrap = (node: React.ReactNode, maxHeight: number): React.ReactNode =>
    compact ? <ScrollBox maxHeight={maxHeight}>{node}</ScrollBox> : node;

  const lists = (
    <div className="space-y-4">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">Habits completed</h3>
        {habitsCompleted.length === 0 ? (
          <p className="text-xs text-text-muted italic">No habits completed</p>
        ) : wrap(
          <div className="space-y-1.5">
            {habitsCompleted.map(h => (
              <div key={h.id} className="flex items-center justify-between gap-2 p-2 rounded-md border border-border-subtle">
                <span className="text-sm font-medium text-text-primary truncate">{h.title}</span>
                <TagChipList tags={h.tags} size="xs" />
              </div>
            ))}
          </div>,
          96
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">Tasks due</h3>
        {tasksDue.length === 0 ? (
          <p className="text-xs text-text-muted italic">No tasks due</p>
        ) : wrap(
          <div className="space-y-1.5">
            {tasksDue.map(t => (
              <TaskDueItem key={t.id} task={t} compact={compact} />
            ))}
          </div>,
          168
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">Notes edited</h3>
        {notesEdited.length === 0 ? (
          <p className="text-xs text-text-muted italic">No notes edited</p>
        ) : wrap(
          <div className="space-y-1.5">
            {notesEdited.map(n => (
              <div key={n.id} className="flex items-center justify-between gap-2 p-2 rounded-md border border-border-subtle">
                <span className="text-sm font-medium text-text-primary truncate">{n.title || 'Untitled Note'}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TagChipList tags={n.tags} size="xs" />
                  <span className="text-[11px] text-text-muted">
                    {new Date(n.updated_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>,
          96
        )}
      </section>
    </div>
  );

  const charts = (
    <div className="space-y-5">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Hours by tag</h3>
        {wrap(
          <CategoryDonutChart categories={donutCategories} size={compact ? 96 : 120} emptyMessage="No estimated hours today" />,
          148
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Hours per task</h3>
        {wrap(
          <CategoryBarsChart categories={barCategories} emptyMessage="No estimated hours today" />,
          112
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Week trend</h3>
        <WeekTrendLineChart days={weekDays} rangeLabel={rangeLabel} />
      </section>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <SummaryTile icon={<Flame className="w-3.5 h-3.5" />} label="Habits" value={`${habitsCompleted.length}/${totalHabits}`} color="#F97316" bg="var(--tm-warning-subtle)" />
        <SummaryTile icon={<SquareCheck className="w-3.5 h-3.5" />} label="Tasks due" value={`${tasksDue.length}`} color="var(--tm-accent)" bg="var(--tm-accent-subtle)" />
        <SummaryTile icon={<Timer className="w-3.5 h-3.5" />} label="Est. hours" value={`${fmtHours(estimatedHours)}h`} color="var(--tm-success)" bg="var(--tm-success-subtle)" />
        <SummaryTile icon={<FileText className="w-3.5 h-3.5" />} label="Notes edited" value={`${notesEdited.length}`} color="var(--tm-accent-2)" bg="var(--tm-accent-2-subtle)" />
      </div>

      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'xl:grid-cols-2'} gap-5`}>
        {lists}
        {charts}
      </div>
    </div>
  );
};

export default DaySummary;
