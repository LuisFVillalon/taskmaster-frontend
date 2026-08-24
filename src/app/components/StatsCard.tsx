'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, CheckSquare, Flame, Check, Repeat, Star, CalendarDays,
  ChevronLeft, ChevronRight, TrendingUp, Type, Cuboid, NotebookText,
} from 'lucide-react';
import { Task, TagStats } from '@/app/types/task';
import { Note } from '@/app/types/notes';
import { Habit, HabitHistoryEntry, fetchHabitHistory } from '@/app/lib/backend-api';
import { formatDateRange, formatUpdatedDate, toLocalDateStr } from '@/app/utils/dateUtils';
import { getPriorityStyle } from '@/app/utils/taskUtils';

// Tiptap stores note content as HTML — strip tags to approximate word count.
const countWords = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
};

// ── Prop types ────────────────────────────────────────────────────────────────

type TasksVariant = {
  variant: 'tasks';
  tasks: Task[];
  total: number;
  active: number;
  activeTags: TagStats[];
  completedTags: TagStats[];
};

type NotesVariant = {
  variant: 'notes';
  notes: Note[];         // all notes, unsorted
  noteTags: TagStats[];
};

type HabitsVariant = {
  variant: 'habits';
  habits: Habit[];
  onToggle: (id: number) => void;
  onCreate?: () => void;
  pendingHabitIds?: Set<number>;
  loading?: boolean;
};

type StatsCardProps = TasksVariant | NotesVariant | HabitsVariant;

// ── Shared sub-components ─────────────────────────────────────────────────────

interface CardShellProps {
  icon: React.ReactNode;
  header: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const CardShell: React.FC<CardShellProps> = ({ icon, header, children, headerAction }) => {
  return (
    <div className="card h-full p-3 sm:p-4 lg:p-5 flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs sm:text-sm md:text-base text-text-muted font-medium uppercase tracking-wide">
          {header}
        </span>
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      {children}
    </div>
  );
};

interface ProgressRingProps {
  pct: number;
  color: string;
  label?: string;
  detail?: string;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  complete?: boolean;
  hideLabel?: boolean;
  fluid?: boolean;
}

// Flat-fill circular progress indicator — a colored arc over a hairline
// track, no gradient. Two of these sit side by side to contrast overall
// completion against completion within priority-tagged tasks.
const ProgressRing: React.FC<ProgressRingProps> = ({
  pct, color, label, detail, size = 76, strokeWidth = 7, centerLabel, complete, hideLabel, fluid,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference * (1 - clamped / 100);

  const ring = (
    <div className={fluid ? 'relative aspect-square mx-auto' : 'relative flex-shrink-0'} style={fluid ? { width: '39%' } : { width: size, height: size }}>
      <svg width={fluid ? '100%' : size} height={fluid ? '100%' : size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--tm-surface-raised)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: `stroke-dashoffset var(--tm-dur-slow) var(--tm-ease)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <Check className="w-1/2 h-1/2" style={{ color }} strokeWidth={2.5} />
        ) : (
          <span
            className={`${fluid ? 'text-sm sm:text-base' : centerLabel ? 'text-sm sm:text-base' : 'text-base sm:text-lg'} font-bold leading-none`}
            style={{ color: 'var(--tm-text-primary)' }}
          >
            {centerLabel ?? `${clamped}%`}
          </span>
        )}
      </div>
    </div>
  );

  if (hideLabel) return ring;

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      {ring}
      <div className="flex flex-col items-center gap-0 text-center">
        <span className={`${fluid ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} font-semibold`} style={{ color }}>{label}</span>
        <span className={`${fluid ? 'text-xs sm:text-sm' : 'text-[11px] xs:text-xs'} text-text-muted`}>{detail}</span>
      </div>
    </div>
  );
};

interface WeekSegment {
  total: number;
  completed: number;
  isToday: boolean;
}

interface SegmentedProgressRingProps {
  segments: WeekSegment[]; // seven entries, Monday through Sunday
  pct: number;
  color: string;
  label: string;
  detail: string;
  size?: number;
  strokeWidth?: number;
  fluid?: boolean;
}

// Like ProgressRing, but the arc is split into one hairline-gapped segment
// per day (Mon–Sun) instead of a single continuous sweep — a flat-fill
// glance at which days are done, pending, or empty this week.
const SegmentedProgressRing: React.FC<SegmentedProgressRingProps> = ({
  segments, pct, color, label, detail, size = 76, strokeWidth = 7, fluid,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const gapLen = 3;

  // Days with no tasks due carry no weight and get skipped entirely — only
  // days that actually have tasks get a slice of the ring, sized by their
  // share of the week's total task count. That way each day's own
  // completion fraction, multiplied by its slice width, always sums to
  // exactly the overall pct: the ring's colored length matches the number
  // in the middle no matter how tasks are distributed across the week.
  const activeDays = segments.filter(s => s.total > 0);
  const totalTasks = activeDays.reduce((sum, s) => sum + s.total, 0);
  const availableLen = circumference - activeDays.length * gapLen;

  const slices = activeDays.reduce<{ seg: WeekSegment; segLen: number; startOffset: number }[]>((acc, seg) => {
    const segLen = totalTasks > 0 ? (seg.total / totalTasks) * availableLen : 0;
    const prevEnd = acc.length > 0 ? acc[acc.length - 1].startOffset + acc[acc.length - 1].segLen + gapLen : 0;
    return [...acc, { seg, segLen, startOffset: prevEnd }];
  }, []);

  // Only the filled (completed) portion of each active day gets its own
  // gapped arc — the track underneath is one uninterrupted circle (same as
  // the plain ProgressRing), so the ring always reads as a complete circle
  // even when most days of the week have no tasks due.
  const fillArcs = slices.flatMap(({ seg, segLen: thisSegLen, startOffset }) => {
    const filledLen = thisSegLen * (seg.completed / seg.total);
    if (filledLen <= 0) return [];
    return [(
      <circle
        key={`${startOffset}-fill`}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={seg.isToday ? strokeWidth + 2 : strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${filledLen} ${circumference}`}
        strokeDashoffset={-startOffset}
        style={{ transition: `stroke-dasharray var(--tm-dur-slow) var(--tm-ease)` }}
      />
    )];
  });

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div className={fluid ? 'relative aspect-square mx-auto' : 'relative flex-shrink-0'} style={fluid ? { width: '39%' } : { width: size, height: size }}>
        <svg width={fluid ? '100%' : size} height={fluid ? '100%' : size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--tm-surface-raised)" strokeWidth={strokeWidth} />
          {fillArcs}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm sm:text-base font-bold leading-none" style={{ color: 'var(--tm-text-primary)' }}>
            {clamped}%
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0 text-center">
        <span className={`${fluid ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} font-semibold`} style={{ color }}>{label}</span>
        <span className={`${fluid ? 'text-xs sm:text-sm' : 'text-[11px] xs:text-xs'} text-text-muted`}>{detail}</span>
      </div>
    </div>
  );
};

interface TagChipsProps {
  tags: TagStats[];
  icon?: React.ReactNode;
}

const TagChips: React.FC<TagChipsProps> = ({ tags, icon }) => {
  if (tags.length === 0) {
    return <p className="text-xs sm:text-sm text-text-muted italic">No tags</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-x-3 sm:gap-y-1.5">
      {tags.map(tag => (
        <span
          key={tag.name}
          style={{ backgroundColor: tag.color ?? 'var(--tm-accent)', color: 'white' }}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap"
        >
          {icon}
          {tag.name} ({tag.count})
        </span>
      ))}
    </div>
  );
};

interface CategoryLegendRowProps {
  label: string;
  count: number;
  color: string;
}

// A compact legend row — color dot, label, numeric count — paired with
// CategoryDonut so the exact per-category totals sit beside the chart
// that shows their relative share.
const CategoryLegendRow: React.FC<CategoryLegendRowProps> = ({ label, count, color }) => (
  <div className="flex items-center gap-1">
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <span className="text-xs sm:text-sm text-text-secondary truncate">{label}</span>
    <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--tm-text-primary)' }}>
      {count}
    </span>
  </div>
);

interface DonutCategory {
  label: string;
  count: number;
  color: string;
}

// Buckets a task list by tag (plus an "Untagged" catch-all) for CategoryDonut
// — shared by the Tasks card's "Overall" (all tasks) and "Priority"
// (priority-assigned tasks only) rings so both read as a tag distribution.
const tagCategoriesFromTasks = (taskList: Task[]): DonutCategory[] => {
  const tagMap = new Map<string, { color: string; count: number }>();
  for (const task of taskList) {
    for (const tag of task.tags) {
      const existing = tagMap.get(tag.name);
      if (existing) { existing.count++; }
      else { tagMap.set(tag.name, { color: tag.color ?? 'var(--tm-accent)', count: 1 }); }
    }
  }
  const untaggedCount = taskList.filter(t => t.tags.length === 0).length;
  return [
    ...Array.from(tagMap.entries()).map(([name, { color, count }]) => ({ label: name, count, color })),
    ...(untaggedCount > 0 ? [{ label: 'Untagged', count: untaggedCount, color: 'var(--tm-border)' }] : []),
  ].sort((a, b) => b.count - a.count);
};

interface TagPriorityCategory extends DonutCategory {
  priorities: number[]; // ascending — most urgent (lowest number) first
}

// Like tagCategoriesFromTasks, but also carries the priority number of every
// prioritized task within each tag — used by the Priority carousel slide so
// one view answers both "how many tasks in this tag" (the bar) and "which of
// them are prioritized, at what rank" (badges alongside it) instead of
// priority and tag being two separate breakdowns.
const tagPriorityCategoriesFromTasks = (taskList: Task[]): TagPriorityCategory[] => {
  const tagMap = new Map<string, { color: string; count: number; priorities: number[] }>();
  for (const task of taskList) {
    for (const tag of task.tags) {
      const existing = tagMap.get(tag.name);
      if (existing) {
        existing.count++;
        if (task.priority != null) existing.priorities.push(task.priority);
      } else {
        tagMap.set(tag.name, {
          color: tag.color ?? 'var(--tm-accent)',
          count: 1,
          priorities: task.priority != null ? [task.priority] : [],
        });
      }
    }
  }
  const untaggedTasks = taskList.filter(t => t.tags.length === 0);
  const rows: TagPriorityCategory[] = [
    ...Array.from(tagMap.entries()).map(([name, { color, count, priorities }]) => ({
      label: name,
      count,
      color,
      priorities: [...priorities].sort((a, b) => a - b),
    })),
    ...(untaggedTasks.length > 0 ? [{
      label: 'Untagged',
      count: untaggedTasks.length,
      color: 'var(--tm-border)',
      priorities: untaggedTasks
        .filter(t => t.priority != null)
        .map(t => t.priority as number)
        .sort((a, b) => a - b),
    }] : []),
  ];
  return rows.sort((a, b) => b.count - a.count);
};

interface CategoryDonutProps {
  categories: DonutCategory[];
  size?: number;
  strokeWidth?: number;
}

// A flat-fill donut chart — one hairline-gapped arc per category, sized to
// its share of the total, in place of a gradient sweep. The hole shows the
// active category's share of the total (its color echoed in the text) — the
// largest category by default, or whichever arc is currently hovered, with
// every other arc fading out so the highlighted one reads clearly.
const CategoryDonut: React.FC<CategoryDonutProps> = ({ categories, size = 128, strokeWidth = 22 }) => {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0) || 1;
  const gapLen = categories.length > 1 ? 3 : 0;

  const largestCategory = categories.reduce((max, c) => (c.count > max.count ? c : max), categories[0]);
  const activeCategory = categories.find(c => c.label === hoveredLabel) ?? largestCategory;
  const activePct = Math.round((activeCategory.count / totalCount) * 100);

  const rawLens = categories.map(c => (c.count / totalCount) * circumference);
  const arcs = categories.map((c, i) => {
    const rawLen = rawLens[i];
    const segLen = Math.max(rawLen - gapLen, 0);
    const startOffset = rawLens.slice(0, i).reduce((sum, len) => sum + len, 0);
    const isActive = c.label === activeCategory.label;
    return (
      <circle
        key={c.label}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={c.color}
        strokeWidth={strokeWidth}
        strokeOpacity={isActive ? 1 : 0.25}
        strokeDasharray={`${segLen} ${circumference}`}
        strokeDashoffset={-startOffset}
        onMouseEnter={() => setHoveredLabel(c.label)}
        onMouseLeave={() => setHoveredLabel(null)}
        style={{ transition: `stroke-opacity var(--tm-dur-slow) var(--tm-ease)`, cursor: 'pointer' }}
      >
        <title>{`${c.label}: ${c.count} (${Math.round((c.count / totalCount) * 100)}%)`}</title>
      </circle>
    );
  });

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--tm-surface-raised)" strokeWidth={strokeWidth} />
        {arcs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2">
        <span
          className="font-bold leading-none transition-colors"
          style={{
            color: activeCategory.color,
            fontSize: `${Math.max(size * 0.19, 11)}px`,
            transitionDuration: 'var(--tm-dur-slow)',
            transitionTimingFunction: 'var(--tm-ease)',
          }}
        >
          {activePct}%
        </span>
        <span
          className="text-text-muted mt-0.5 max-w-full truncate text-center"
          style={{ fontSize: `${Math.max(size * 0.09, 9)}px` }}
        >
          {activeCategory.label}
        </span>
      </div>
    </div>
  );
};

interface CategoryCountProps {
  count: number;
  pct: number;
}

// The label width shared by every category row (CategoryBarChart and
// TagPriorityChart alike) — kept narrow so the row's other two columns (the
// bar and the count) have more room to work with.
const CATEGORY_LABEL_WIDTH = '4rem';

// Inline "count (pct%)" pairing — bold count for the exact tally, a muted
// parenthesized percentage for its share of the chart's own total (the sum
// of every category's count, mirroring how CategoryDonut computes its own
// share). Both ride the app's standard caption scale (text-xs sm:text-sm,
// Stone/--tm-text-muted per DESIGN.md) rather than a one-off tiny size, so
// the percentage reads as easily as the count it's paired with.
const CategoryCount: React.FC<CategoryCountProps> = ({ count, pct }) => (
  <span className="flex-shrink-0 text-right whitespace-nowrap" style={{ width: '4.5rem' }}>
    <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--tm-text-primary)' }}>{count}</span>
    <span className="text-xs sm:text-sm text-text-muted font-medium ml-1">({pct}%)</span>
  </span>
);

interface CategoryBarChartProps {
  categories: DonutCategory[];
  total: number;
  totalLabel: string;
  emptyMessage: string;
}

// A flat-fill horizontal bar chart — one pill-ended track per category,
// filled relative to the busiest category, with its exact count and share of
// the total alongside — used by the Priority/Active/Completed carousel
// slides so each reads as a scannable per-category breakdown (plus the grand
// total) rather than a donut's relative share.
const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ categories, total, totalLabel, emptyMessage }) => {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ minHeight: '5rem' }}>
        <p className="text-xs sm:text-sm text-text-muted italic">{emptyMessage}</p>
      </div>
    );
  }

  const maxCount = Math.max(...categories.map(c => c.count));
  const sumCount = categories.reduce((sum, c) => sum + c.count, 0) || 1;

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-bold leading-none" style={{ color: 'var(--tm-text-primary)' }}>
          {total}
        </span>
        <span className="text-xs sm:text-sm text-text-muted font-medium">{totalLabel}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {categories.map((c, i) => (
          <div key={c.label} className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: `${i * 35}ms` }}>
            <span
              className="text-xs sm:text-sm text-text-secondary truncate flex-shrink-0"
              style={{ width: CATEGORY_LABEL_WIDTH }}
              title={c.label}
            >
              {c.label}
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tm-surface-raised)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((c.count / maxCount) * 100, 6)}%`,
                  backgroundColor: c.color,
                  transition: `width var(--tm-dur-slow) var(--tm-ease)`,
                }}
              />
            </div>
            <CategoryCount count={c.count} pct={Math.round((c.count / sumCount) * 100)} />
          </div>
        ))}
      </div>
    </div>
  );
};

interface DayHoursPoint {
  date: Date;
  hours: number;
  isToday: boolean;
}

interface HoursLineChartProps {
  days: DayHoursPoint[]; // seven entries, Monday through Sunday
  rangeLabel: string;
}

const formatHours = (hours: number): string => (Number.isInteger(hours) ? `${hours}` : hours.toFixed(1));

// A flat-fill line chart — one dot per day, its height driven by that day's
// summed estimated_time across every task due that day — plotted over the
// current Monday–Sunday week so scheduled workload reads as a trend rather
// than a single snapshot number.
const HoursLineChart: React.FC<HoursLineChartProps> = ({ days, rangeLabel }) => {
  const totalHours = days.reduce((sum, d) => sum + d.hours, 0);

  const header = (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl sm:text-3xl font-bold leading-none" style={{ color: 'var(--tm-text-primary)' }}>
        {formatHours(totalHours)}
      </span>
      <span className="text-xs sm:text-sm text-text-muted font-medium">hrs scheduled ({rangeLabel})</span>
    </div>
  );

  if (totalHours <= 0) {
    return (
      <div className="flex flex-col gap-2.5 pt-1">
        {header}
        <div className="flex items-center justify-center text-center" style={{ minHeight: '5rem' }}>
          <p className="text-xs sm:text-sm text-text-muted italic">No estimated hours this week</p>
        </div>
      </div>
    );
  }

  const W = 300;
  const H = 100;
  const padL = 24;
  const padR = 10;
  const padT = 14;
  const padB = 16;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxHours = Math.max(...days.map(d => d.hours), 1);
  const axisMax = Math.max(Math.ceil(maxHours), 1);
  const stepX = days.length > 1 ? plotW / (days.length - 1) : 0;

  const points = days.map((d, i) => ({
    ...d,
    x: padL + stepX * i,
    y: padT + plotH - (d.hours / axisMax) * plotH,
  }));

  const yTicks = Array.from({ length: axisMax + 1 }, (_, i) => {
    const value = i;
    return { value, y: padT + plotH - (value / axisMax) * plotH };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padT + plotH} L ${points[0].x} ${padT + plotH} Z`;

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {header}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-3/4 h-auto mx-auto">
        {yTicks.map((t, i) => (
          <line
            key={`grid-${i}`}
            x1={padL}
            y1={t.y}
            x2={W - padR}
            y2={t.y}
            stroke="var(--tm-border)"
            strokeWidth={1}
            opacity={t.value === 0 ? 1 : 0.35}
          />
        ))}
        {yTicks.map((t, i) => (
          <text key={`ylabel-${i}`} x={0} y={t.y + 2.5} fontSize={7} fill="var(--tm-text-muted)">
            {formatHours(t.value)}h
          </text>
        ))}
        <path d={areaPath} fill="var(--tm-accent)" fillOpacity={0.1} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--tm-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.isToday ? 4 : 2.75}
            fill={p.isToday ? 'var(--tm-accent)' : 'var(--tm-surface)'}
            stroke="var(--tm-accent)"
            strokeWidth={2}
          >
            <title>{`${p.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}: ${formatHours(p.hours)}h`}</title>
          </circle>
        ))}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={H - 3}
            fontSize={8}
            textAnchor="middle"
            fontWeight={p.isToday ? 700 : 400}
            fill={p.isToday ? 'var(--tm-accent)' : 'var(--tm-text-muted)'}
          >
            {p.date.toLocaleDateString(undefined, { weekday: 'narrow' })}
          </text>
        ))}
      </svg>
    </div>
  );
};

interface PriorityBadgeProps {
  priority: number;
}

// A compact read-only pill in the same getPriorityStyle ramp PriorityPicker
// uses for its live badge — so a priority number reads identically here as it
// does on the task itself, just without the click-to-edit affordance.
const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const style = getPriorityStyle(priority);
  return (
    <span
      className="inline-flex items-center justify-center font-bold rounded-full flex-shrink-0"
      style={{ backgroundColor: style.bg, color: style.text, padding: '0.05rem 0.4rem', fontSize: '10px', lineHeight: 1.4 }}
      title={`Priority ${priority}`}
    >
      P{priority}
    </span>
  );
};

interface TagPriorityChartProps {
  categories: TagPriorityCategory[];
  total: number;
  totalLabel: string;
  emptyMessage: string;
}

// Like CategoryBarChart, but each tag's bar can carry a second line of small
// priority badges underneath — one per prioritized task in that tag, most
// urgent first — so a single view answers both "how many tasks per tag" (the
// bar) and "which of them are prioritized, at what rank" (the badges).
const TagPriorityChart: React.FC<TagPriorityChartProps> = ({ categories, total, totalLabel, emptyMessage }) => {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ minHeight: '5rem' }}>
        <p className="text-xs sm:text-sm text-text-muted italic">{emptyMessage}</p>
      </div>
    );
  }

  const maxCount = Math.max(...categories.map(c => c.count));
  const sumCount = categories.reduce((sum, c) => sum + c.count, 0) || 1;

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-bold leading-none" style={{ color: 'var(--tm-text-primary)' }}>
          {total}
        </span>
        <span className="text-xs sm:text-sm text-text-muted font-medium">{totalLabel}</span>
      </div>
      <div className="flex flex-col gap-2">
        {categories.map((c, i) => (
          <div key={c.label} className="flex flex-col gap-1 animate-fade-in" style={{ animationDelay: `${i * 35}ms` }}>
            <div className="flex items-center gap-2">
              <span
                className="text-xs sm:text-sm text-text-secondary truncate flex-shrink-0"
                style={{ width: CATEGORY_LABEL_WIDTH }}
                title={c.label}
              >
                {c.label}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tm-surface-raised)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((c.count / maxCount) * 100, 6)}%`,
                    backgroundColor: c.color,
                    transition: `width var(--tm-dur-slow) var(--tm-ease)`,
                  }}
                />
              </div>
              <CategoryCount count={c.count} pct={Math.round((c.count / sumCount) * 100)} />
            </div>
            {c.priorities.length > 0 && (
              <div className="flex flex-wrap gap-1" style={{ paddingLeft: `calc(${CATEGORY_LABEL_WIDTH} + 0.5rem)` }}>
                {c.priorities.map(p => (
                  <PriorityBadge key={p} priority={p} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface NoteRowProps {
  note: Note;
  metric: string;
  onOpen: (note: Note) => void;
}

// A note row that doubles as a nav link — clicking it opens the note in the
// full notes view (/notes?id=…). `metric` is whatever the active carousel
// slide wants shown on the right (last-updated time, word count, …).
const NoteRow: React.FC<NoteRowProps> = ({ note, metric, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(note)}
    title={`Open "${note.title || 'Untitled'}"`}
    className="w-full flex items-center gap-2 py-0.5 -mx-1.5 px-1.5 rounded-md text-left transition-colors hover:bg-surface-raised"
  >
    <span className="flex items-center gap-0.5 flex-shrink-0">
      {note.tags.length > 0 ? (
        note.tags.slice(0, 3).map(tag => (
          <span
            key={tag.id}
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: tag.color ?? 'var(--tm-accent)' }}
            title={tag.name}
          />
        ))
      ) : (
        <FileText className="w-2.5 h-2.5 text-text-muted flex-shrink-0" />
      )}
    </span>
    <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--tm-text-primary)' }}>
      {note.title || 'Untitled'}
    </span>
    <span className="text-xs text-text-muted flex-shrink-0">{metric}</span>
  </button>
);

interface ActivityStatRowProps {
  icon: React.ReactNode;
  value: number;
  label: string;
}

// A left-aligned icon + value + label row, echoing CategoryLegendRow's flow
// so the "Writing Activity" list reads as part of the same left-aligned
// stack rather than a separate block of centered numbers.
const ActivityStatRow: React.FC<ActivityStatRowProps> = ({ icon, value, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="flex-shrink-0" style={{ color: 'var(--tm-accent)' }}>{icon}</span>
    <span className="text-base font-bold leading-none flex-shrink-0" style={{ color: 'var(--tm-text-primary)' }}>
      {value}
    </span>
    <span className="text-xs sm:text-sm text-text-muted truncate">{label}</span>
  </div>
);

interface NoteCarouselSlide {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface NoteCarouselProps {
  slides: NoteCarouselSlide[];
}

// A tiny dot/arrow carousel that swaps between a few note-derived stats
// inside a fixed-height footer, so the card doesn't reflow between slides.
const NoteCarousel: React.FC<NoteCarouselProps> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const active = slides[Math.min(index, slides.length - 1)];
  const go = (delta: number) => setIndex(prev => (prev + delta + slides.length) % slides.length);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {active.label}
        </span>
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous stat"
              className="p-1 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${s.label}`}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: i === index ? 'var(--tm-accent)' : 'var(--tm-border)' }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next stat"
              className="p-1 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-0.5" style={{ minHeight: '5rem' }}>
        {active.content}
      </div>
    </div>
  );
};

interface TaskCarouselSlide {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface TaskStatsCarouselProps {
  slides: TaskCarouselSlide[];
}

// Like NoteCarousel, but slides transform-translate past each other instead
// of swapping instantly — a continuous sliding-glass motion (swipeable on
// touch too) so the Today/Priority/Active/Completed views read as one fluid
// strip of stats rather than a series of unrelated screens.
const TaskStatsCarousel: React.FC<TaskStatsCarouselProps> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const go = (delta: number) => setIndex(prev => (prev + delta + slides.length) % slides.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  // Track the active slide's own height (rather than letting the row
  // stretch to the tallest slide) so switching to a shorter slide doesn't
  // leave dead blank space below its content.
  useEffect(() => {
    const activeEl = slideRefs.current[index];
    if (!activeEl) return;
    setHeight(activeEl.offsetHeight);

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setHeight(entry.contentRect.height);
    });
    observer.observe(activeEl);
    return () => observer.disconnect();
  }, [index, slides]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {slides[index].label}
        </span>
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous stat"
              className="p-1.5 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show ${s.label}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === index ? '14px' : '6px',
                    backgroundColor: i === index ? 'var(--tm-accent)' : 'var(--tm-border)',
                    transitionDuration: 'var(--tm-dur-base)',
                    transitionTimingFunction: 'var(--tm-ease)',
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next stat"
              className="p-1.5 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <div
        className="overflow-hidden"
        style={{
          height,
          transition: `height var(--tm-dur-slow) var(--tm-ease)`,
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex items-start"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: `transform var(--tm-dur-slow) var(--tm-ease)`,
          }}
        >
          {slides.map((s, i) => (
            <div
              key={s.key}
              ref={el => { slideRefs.current[i] = el; }}
              className="w-full flex-shrink-0 min-w-0"
            >
              {s.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface StreakBadgeProps {
  icon: React.ReactNode;
  value: number;
  color: string;
  title: string;
}

// A flat-fill pill tinted from its own icon color (per the DESIGN.md Pill Tag
// spec) — used for the current/best streak counts on each habit row.
const StreakBadge: React.FC<StreakBadgeProps> = ({ icon, value, color, title }) => (
  <div
    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full flex-shrink-0"
    style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
    title={title}
  >
    {icon}
    <span className="text-xs font-semibold leading-none">{value}</span>
  </div>
);

interface HabitRowProps {
  habit: Habit;
  onToggle: (id: number) => void;
  onSelectHeatmap: (id: number) => void;
  heatmapSelected?: boolean;
  pending?: boolean;
}

const HabitRow: React.FC<HabitRowProps> = ({ habit, onToggle, onSelectHeatmap, heatmapSelected, pending }) => {
  const done = habit.logged_today;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectHeatmap(habit.id)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectHeatmap(habit.id);
        }
      }}
      className={`group flex flex-col -mx-1.5 px-1.5 py-1.5 rounded-md transition-colors cursor-pointer ${done ? '' : 'hover:bg-surface-raised'}`}
      style={
        done
          ? { backgroundColor: 'var(--tm-success-subtle)' }
          : heatmapSelected
          ? { backgroundColor: 'var(--tm-accent-subtle)' }
          : undefined
      }
      aria-pressed={heatmapSelected}
      aria-label={`View 30-day heatmap for ${habit.title}`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={e => {
            e.stopPropagation();
            onToggle(habit.id);
          }}
          disabled={pending}
          className={`flex-shrink-0 w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all active:scale-90 ${
            done ? 'border-[var(--tm-success)] bg-[var(--tm-success)]' : 'border-border hover:border-accent'
          }`}
          style={{ opacity: pending ? 0.5 : 1, cursor: pending ? 'wait' : 'pointer' }}
          aria-label={done ? `Unmark ${habit.title}` : `Mark ${habit.title} done`}
        >
          {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
        <span className="flex-1 flex items-center gap-1.5 min-w-0">
          {habit.tags.length > 0 && (
            <span className="flex items-center gap-0.5 flex-shrink-0">
              {habit.tags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color ?? 'var(--tm-accent)' }}
                  title={tag.name}
                />
              ))}
            </span>
          )}
          <span
            className={`text-base truncate font-medium ${done ? 'line-through text-text-muted' : ''}`}
            style={done ? undefined : { color: 'var(--tm-text-primary)' }}
          >
            {habit.title}
          </span>
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <StreakBadge icon={<Flame className="w-3 h-3" />} value={habit.current_streak} color="#F97316" title="Current streak" />
          {habit.max_streak > habit.current_streak && (
            <StreakBadge icon={<Star className="w-3 h-3" />} value={habit.max_streak} color="#EAB308" title="Best streak" />
          )}
        </div>
      </div>
    </div>
  );
};

interface HabitHeatmapProps {
  habit: Habit;
}

// GitHub-contribution-style 90-day heatmap for a single habit — weeks run
// left→right as columns, Mon–Sun top→bottom within each column. Replaces
// the aggregate progress ring in the habits card once a habit is selected
// via its row's calendar icon.
const HEATMAP_DAYS = 90;

const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habit }) => {
  const [history, setHistory] = useState<HabitHistoryEntry[]>([]);
  // Tracks which habit `history` was fetched for, so loading state can be
  // derived during render instead of set synchronously inside the effect.
  const [loadedHabitId, setLoadedHabitId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHabitHistory(habit.id, HEATMAP_DAYS)
      .then(data => {
        if (cancelled) return;
        setHistory(data);
        setLoadedHabitId(habit.id);
      })
      .catch(err => console.error('[HabitHeatmap] Failed to fetch history:', err));
    return () => { cancelled = true; };
  }, [habit.id]);

  const loading = loadedHabitId !== habit.id;

  const DAYS = HEATMAP_DAYS;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (DAYS - 1)); // DAYS days including today

  const loggedSet = new Set(history.filter(e => e.logged).map(e => e.date));
  const todayStr = toLocalDateStr(today);
  // "Today" is tracked authoritatively on the habit object itself (shared
  // with the stats-card checkbox), not the independently-fetched history
  // list — override so this heatmap can never disagree with the checkbox.
  if (habit.logged_today) loggedSet.add(todayStr);
  else loggedSet.delete(todayStr);

  // Rolling DAYS-day window chunked into fixed-width rows, oldest → newest,
  // left-to-right then top-to-bottom (like reading text) rather than
  // aligned to real calendar weeks — so the grid is always wider than it
  // is tall, and today always lands in the bottom-right corner regardless
  // of which weekday it falls on. Padding cells go at the start (oldest
  // side) so the real days end exactly on the last cell.
  const COLUMNS = 15;
  const padCount = (COLUMNS - (DAYS % COLUMNS)) % COLUMNS;
  const cells: (Date | null)[] = Array(padCount).fill(null);
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push(d);
  }
  const loggedCount = cells.filter(d => d && loggedSet.has(toLocalDateStr(d))).length;
  const pct = Math.round((loggedCount / DAYS) * 100);

  // Tiered color so the ring and count warm from amber to blue to green as
  // the DAYS-day rate climbs, echoing the streak badges' color language.
  const ringColor =
    pct >= 70 ? 'var(--tm-success)' :
    pct >= 40 ? 'var(--tm-accent)' :
    loggedCount > 0 ? 'var(--tm-warning)' :
    'var(--tm-text-muted)';

  const dateFmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const sameYear = startDate.getFullYear() === today.getFullYear();
  const rangeLabel = sameYear
    ? `${startDate.toLocaleDateString(undefined, dateFmt)} – ${today.toLocaleDateString(undefined, { ...dateFmt, year: 'numeric' })}`
    : `${startDate.toLocaleDateString(undefined, { ...dateFmt, year: 'numeric' })} – ${today.toLocaleDateString(undefined, { ...dateFmt, year: 'numeric' })}`;

  return (
    <div className="flex flex-col gap-2 w-full min-w-0 max-w-sm mx-auto">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary truncate min-w-0" title={habit.title}>
          {habit.title}
        </span>
        {loading ? (
          <div className="rounded-full animate-pulse flex-shrink-0" style={{ width: 52, height: 52, backgroundColor: 'var(--tm-surface-raised)' }} />
        ) : (
          <ProgressRing pct={pct} color={ringColor} centerLabel={`${pct}%`} size={52} strokeWidth={5} hideLabel />
        )}
      </div>

      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 w-full">
        {cells.map((date, i) => {
          if (loading || !date) return <div key={i} className={`aspect-square rounded ${loading ? 'animate-pulse' : ''}`} style={loading ? { backgroundColor: 'var(--tm-surface-raised)' } : undefined} />;
          const dateStr = toLocalDateStr(date);
          const isLogged = loggedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              title={`${date.toLocaleDateString(undefined, dateFmt)}${isLogged ? ' — done' : ' — not logged'}${isToday ? ' (today)' : ''}`}
              className="relative aspect-square rounded transition-transform hover:z-10 hover:scale-125"
              style={{
                backgroundColor: isLogged ? 'var(--tm-accent)' : 'var(--tm-surface-raised)',
                border: isLogged ? 'none' : '1px solid var(--tm-border-subtle)',
                boxShadow: isToday ? '0 0 0 1px var(--tm-accent), 0 0 0 3px var(--tm-accent-subtle)' : 'none',
                transitionDuration: 'var(--tm-dur-base)',
                transitionTimingFunction: 'var(--tm-ease)',
              }}
            />
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-2">
        {loading ? (
          <div className="rounded animate-pulse" style={{ width: 96, height: 14, backgroundColor: 'var(--tm-surface-raised)' }} />
        ) : (
          <span className="text-[11px] font-bold truncate" style={{ color: 'var(--tm-text-primary)' }}>{rangeLabel}</span>
        )}
        {loading ? (
          <div className="rounded animate-pulse flex-shrink-0" style={{ width: 56, height: 18, backgroundColor: 'var(--tm-surface-raised)' }} />
        ) : (
          <span className="text-sm flex-shrink-0 whitespace-nowrap">
            <span className="font-bold" style={{ color: 'var(--tm-text-primary)' }}>{loggedCount}</span>
            <span className="text-xs font-semibold text-text-muted">/{DAYS} days</span>
          </span>
        )}
      </div>
    </div>
  );
};

// Broken out from the main switch below so its hooks (selected heatmap
// habit) stay unconditional — the `habits` branch in StatsCard just renders
// this rather than calling hooks inline.
const HabitsStatsCard: React.FC<Omit<HabitsVariant, 'variant'>> = ({
  habits, onToggle, onCreate, pendingHabitIds, loading,
}) => {
  const [heatmapHabitId, setHeatmapHabitId] = useState<number | null>(null);

  if (loading) {
    return (
      <CardShell icon={<Cuboid className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />} header="Habits">
        <div className="h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--tm-surface-raised)' }} />
        <div className="flex flex-col gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-8 rounded-md animate-pulse" style={{ backgroundColor: 'var(--tm-surface-raised)' }} />
          ))}
        </div>
      </CardShell>
    );
  }

  const habitTagMap = new Map<string, { color: string; count: number }>();
  for (const habit of habits) {
    for (const tag of habit.tags) {
      const existing = habitTagMap.get(tag.name);
      if (existing) { existing.count++; }
      else { habitTagMap.set(tag.name, { color: tag.color ?? 'var(--tm-accent)', count: 1 }); }
    }
  }
  const habitTags = Array.from(habitTagMap.entries()).map(([name, { color, count }]) => ({ name, color, count }));

  // Default to the top habit so the right-hand slot is never empty; fall
  // back automatically if the previously-selected habit disappears (e.g. deleted).
  const heatmapHabit = habits.find(h => h.id === heatmapHabitId) ?? habits[0] ?? null;

  return (
    <CardShell
      icon={<Cuboid className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
      header="Habits"
    >
      {habits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <Repeat className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
          <p className="text-xs sm:text-sm text-text-muted">No habits yet — start a streak.</p>
          {onCreate && (
            <button onClick={onCreate} className="btn btn-secondary text-sm px-3 py-1.5">
              Create a habit
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden pr-1">
            {habits.map(h => (
              <HabitRow
                key={h.id}
                habit={h}
                onToggle={onToggle}
                onSelectHeatmap={setHeatmapHabitId}
                heatmapSelected={heatmapHabit?.id === h.id}
                pending={pendingHabitIds?.has(h.id)}
              />
            ))}
          </div>
          <div className="flex justify-center">
            {heatmapHabit && <HabitHeatmap habit={heatmapHabit} />}
          </div>
          <div>
            <TagChips tags={habitTags} />
          </div>
        </div>
      )}
    </CardShell>
  );
};

// Broken out from the main switch below so its hooks (router, carousel
// index, derived note rankings) stay unconditional — the `notes` branch in
// StatsCard just renders this rather than calling hooks inline.
const NotesStatsCard: React.FC<Omit<NotesVariant, 'variant'>> = ({ notes, noteTags }) => {
  const router = useRouter();
  const openNote = (note: Note) => router.push(`/notes?id=${note.id}`);

  const noteCount = notes.length;
  const taggedCount = notes.filter(n => n.tags.length > 0).length;
  const untaggedCount = Math.max(noteCount - taggedCount, 0);

  const categories = [
    ...noteTags.map(t => ({ label: t.name, count: t.count, color: t.color ?? 'var(--tm-accent)' })),
    ...(untaggedCount > 0 ? [{ label: 'Untagged', count: untaggedCount, color: 'var(--tm-border)' }] : []),
  ].sort((a, b) => b.count - a.count);

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()).slice(0, 3),
    [notes],
  );
  const longestNotes = useMemo(
    () => [...notes].sort((a, b) => countWords(b.content) - countWords(a.content)).slice(0, 3),
    [notes],
  );
  const activityStats = useMemo(() => {
    const now = new Date().getTime();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const createdThisWeek = notes.filter(n => new Date(n.created_date).getTime() >= weekAgo).length;
    const createdThisMonth = notes.filter(n => new Date(n.created_date).getTime() >= monthAgo).length;
    const avgWords = noteCount > 0
      ? Math.round(notes.reduce((sum, n) => sum + countWords(n.content), 0) / noteCount)
      : 0;
    return { createdThisWeek, createdThisMonth, avgWords };
  }, [notes, noteCount]);

  const slides: NoteCarouselSlide[] = [
    {
      key: 'recent',
      label: 'Recently Updated',
      content: recentNotes.length > 0
        ? recentNotes.map(note => (
            <NoteRow key={note.id} note={note} metric={formatUpdatedDate(note.updated_date)} onOpen={openNote} />
          ))
        : <p className="text-xs sm:text-sm text-text-muted italic py-2 text-center">Nothing edited yet</p>,
    },
    {
      key: 'longest',
      label: 'Longest Notes',
      content: longestNotes.length > 0
        ? longestNotes.map(note => (
            <NoteRow key={note.id} note={note} metric={`${countWords(note.content)} words`} onOpen={openNote} />
          ))
        : <p className="text-xs sm:text-sm text-text-muted italic py-2 text-center">Write more to see rankings</p>,
    },
  ];

  return (
    <CardShell
      icon={<NotebookText className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
      header="Notes"
    >
      {noteCount === 0 ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <FileText className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
          <p className="text-xs sm:text-sm text-text-muted">No notes yet — jot something down.</p>
        </div>
      ) : (
        // flex-1 + justify-center: the card shell stretches to match whatever
        // taller neighbor shares its grid row (draggable grid, so that
        // neighbor varies), and this content is a fixed height — centering it
        // in the available space keeps any leftover height as balanced
        // top/bottom margin instead of one dead gap under the last quadrant.
        <div className="flex-1 flex flex-col justify-center">
          {/* 2x2 layout: totals+categories, donut, carousel, and writing
              activity each own a quadrant so the card reads as a grid of
              equal-weight stats rather than one long row. */}
          <div className="grid grid-cols-[3fr_2fr] gap-x-4 gap-y-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-2xl lg:text-3xl font-bold leading-none" style={{ color: 'var(--tm-accent)' }}>
                  {noteCount}
                </span>
                <span className="text-xs sm:text-sm text-text-muted font-medium">
                  {noteCount === 1 ? 'note total' : 'notes total'}
                </span>
              </div>
              {categories.length > 0 && (
                // Fills down each column three rows at a time, adding columns as
                // needed; once that runs wider than the card, it scrolls sideways.
                <div className="overflow-x-auto scrollbar-custom pb-1" style={{ maxWidth: '100%' }}>
                  <div
                    className="grid gap-x-3 gap-y-1"
                    style={{ gridTemplateRows: 'repeat(3, auto)', gridAutoFlow: 'column', gridAutoColumns: 'max-content' }}
                  >
                    {categories.map(c => (
                      <CategoryLegendRow key={c.label} label={c.label} count={c.count} color={c.color} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center">
              {categories.length > 0 && (
                <CategoryDonut categories={categories} />
              )}
            </div>
            <div className="min-w-0">
              <NoteCarousel slides={slides} />
            </div>
            {/* Hairline-separated so it reads as a distinct quadrant rather than
                a floating block of numbers. */}
            <div className="flex flex-col gap-1.5 pl-4 border-l" style={{ borderColor: 'var(--tm-border)' }}>
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Writing Activity
              </span>
              <div className="flex flex-col gap-1">
                <ActivityStatRow icon={<TrendingUp className="w-3 h-3" />} value={activityStats.createdThisWeek} label="this week" />
                <ActivityStatRow icon={<CalendarDays className="w-3 h-3" />} value={activityStats.createdThisMonth} label="this month" />
                <ActivityStatRow icon={<Type className="w-3 h-3" />} value={activityStats.avgWords} label="avg words/note" />
              </div>
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const StatsCard: React.FC<StatsCardProps> = (props) => {

  if (props.variant === 'tasks') {
    const { tasks, total } = props;

    // Today's due tasks
    const todayDate = new Date();
    const todayStr = toLocalDateStr(todayDate);
    const todayDateLabel = todayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const todaysTasks = tasks.filter(t => t.due_date && toLocalDateStr(t.due_date) === todayStr);
    const todayTotal = todaysTasks.length;
    const todayCompleted = todaysTasks.filter(t => t.completed).length;
    const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    // This week's due tasks, bucketed Monday–Sunday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun .. 6 = Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    const weekRangeLabel = formatDateRange(monday, sunday);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dStr = toLocalDateStr(d);
      const dTasks = tasks.filter(t => t.due_date && toLocalDateStr(t.due_date) === dStr);
      const hours = dTasks.reduce((sum, t) => sum + (t.estimated_time ?? 0), 0);
      return { date: d, total: dTasks.length, completed: dTasks.filter(t => t.completed).length, isToday: dStr === todayStr, hours };
    });
    const weekTotal = weekDays.reduce((sum, d) => sum + d.total, 0);
    const weekCompleted = weekDays.reduce((sum, d) => sum + d.completed, 0);
    const weekPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
    const weekSegments: WeekSegment[] = weekDays;

    // Tag distribution for "Active" (non-completed tasks) and "Completed",
    // plus a tag×priority breakdown for "Priority" — each rendered as its own
    // bar-chart carousel slide below.
    const activeTagCategories = tagCategoriesFromTasks(tasks.filter(t => !t.completed));
    const completedTagCategories = tagCategoriesFromTasks(tasks.filter(t => t.completed));
    const tagPriorityCategories = tagPriorityCategoriesFromTasks(tasks.filter(t => !t.completed && t.priority != null));
    const activeCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;
    const prioritizedCount = tasks.filter(t => !t.completed && t.priority != null).length;
    const overallPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const carouselSlides: TaskCarouselSlide[] = [
      {
        key: 'overview',
        label: 'Overview',
        content: (
          <div className="grid grid-cols-3 gap-x-3 gap-y-3 pt-1 items-start">
            <ProgressRing
              label={`Today (${todayDateLabel})`}
              detail={todayTotal > 0 ? `${todayCompleted} / ${todayTotal} done` : 'No tasks today'}
              pct={todayPct}
              color="color-mix(in srgb, var(--tm-accent) 55%, white)"
              fluid
            />
            <SegmentedProgressRing
              label={`This Week (${weekRangeLabel})`}
              detail={weekTotal > 0 ? `${weekCompleted} / ${weekTotal} done` : 'No tasks this week'}
              pct={weekPct}
              color="var(--tm-accent)"
              segments={weekSegments}
              fluid
            />
            <ProgressRing
              label="Active"
              detail={`${completedCount} / ${total} done`}
              pct={overallPct}
              color="color-mix(in srgb, var(--tm-accent) 75%, black)"
              fluid
            />
          </div>
        ),
      },
      {
        key: 'hours',
        label: 'Workload',
        content: (
          <HoursLineChart days={weekDays} rangeLabel={weekRangeLabel} />
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        content: (
          <TagPriorityChart
            categories={tagPriorityCategories}
            total={prioritizedCount}
            totalLabel="prioritized"
            emptyMessage="No priorities set yet"
          />
        ),
      },
      {
        key: 'active',
        label: 'Active',
        content: (
          <CategoryBarChart
            categories={activeTagCategories}
            total={activeCount}
            totalLabel="active"
            emptyMessage="All caught up — nothing active"
          />
        ),
      },
      {
        key: 'completed',
        label: 'Completed',
        content: (
          <CategoryBarChart
            categories={completedTagCategories}
            total={completedCount}
            totalLabel="completed"
            emptyMessage="Nothing completed yet"
          />
        ),
      },
    ];

    return (
      <CardShell
        icon={<CheckSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: 'var(--tm-accent)' }} />}
        header="Tasks"
      >
        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <CheckSquare className="w-5 h-5 text-text-muted" strokeWidth={1.5} />
            <p className="text-xs sm:text-sm text-text-muted">No tasks yet — add one to get moving.</p>
          </div>
        ) : (
          <>
            {/* Today/Week/Active overview, plus Priority/Active/Completed
                per-category bar charts, one swipeable carousel slide each */}
            <TaskStatsCarousel slides={carouselSlides} />
          </>
        )}
      </CardShell>
    );
  }

  if (props.variant === 'notes') {
    return <NotesStatsCard {...props} />;
  }

  // variant === 'habits'
  return <HabitsStatsCard {...props} />;
};

export default StatsCard;
