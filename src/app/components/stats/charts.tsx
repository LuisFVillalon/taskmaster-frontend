'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { getPriorityStyle } from '@/app/utils/taskUtils';
import { TrendLineChart } from '@/app/components/charts/TrendLineChart';

// ── Progress rings ───────────────────────────────────────────────────────────

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
export const ProgressRing: React.FC<ProgressRingProps> = ({
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

export interface WeekSegment {
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
export const SegmentedProgressRing: React.FC<SegmentedProgressRingProps> = ({
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

// ── Category donut / bar / priority charts ───────────────────────────────────

export interface DonutCategory {
  label: string;
  count: number;
  color: string;
}

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
export const CategoryDonut: React.FC<CategoryDonutProps> = ({ categories, size = 128, strokeWidth = 22 }) => {
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
export const CATEGORY_LABEL_WIDTH = '4rem';

// Inline "count (pct%)" pairing — bold count for the exact tally, a muted
// parenthesized percentage for its share of the chart's own total (the sum
// of every category's count, mirroring how CategoryDonut computes its own
// share). Both ride the app's standard caption scale (text-xs sm:text-sm,
// Stone/--tm-text-muted per DESIGN.md) rather than a one-off tiny size, so
// the percentage reads as easily as the count it's paired with.
export const CategoryCount: React.FC<CategoryCountProps> = ({ count, pct }) => (
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
export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ categories, total, totalLabel, emptyMessage }) => {
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

// ── Hours-per-week line chart ─────────────────────────────────────────────────

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
// than a single snapshot number. The plot itself is the shared TrendLineChart
// (see components/charts/TrendLineChart.tsx); this just adds the "N hrs
// scheduled (range)" header specific to the Tasks card.
export const HoursLineChart: React.FC<HoursLineChartProps> = ({ days, rangeLabel }) => {
  const totalHours = days.reduce((sum, d) => sum + d.hours, 0);

  const header = (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl sm:text-3xl font-bold leading-none" style={{ color: 'var(--tm-text-primary)' }}>
        {formatHours(totalHours)}
      </span>
      <span className="text-xs sm:text-sm text-text-muted font-medium">hrs scheduled ({rangeLabel})</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {header}
      <TrendLineChart days={days} svgClassName="w-3/4 h-auto mx-auto" />
    </div>
  );
};

// ── Priority badges + tag×priority bar chart ─────────────────────────────────

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

export interface TagPriorityCategory extends DonutCategory {
  priorities: number[]; // ascending — most urgent (lowest number) first
}

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
export const TagPriorityChart: React.FC<TagPriorityChartProps> = ({ categories, total, totalLabel, emptyMessage }) => {
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
