'use client';

import React, { useState } from 'react';
import { TrendLineChart } from '@/app/components/charts/TrendLineChart';

// Small SVG chart primitives for the day-detail view. Mirrors the flat-fill
// donut / bar / line patterns already shipped in components/stats/charts.tsx
// (same CSS vars, same arc/gap math) so these read as part of the same chart
// system, just scoped to a single day's tasks instead of a habit or the full
// task list. Category colors intentionally come from each tag's own
// user-chosen `color` (the same value shown on that tag everywhere else in
// the app — task chips, note chips, the tag manager) rather than a freshly
// generated categorical ramp, so a tag's identity color never drifts between
// screens.
//
// The line chart's plot geometry was a genuine byte-for-byte duplicate of
// stats/charts.tsx's HoursLineChart and is now the shared TrendLineChart
// (components/charts/TrendLineChart.tsx). CategoryDonutChart/CategoryBarsChart
// below were evaluated for the same treatment and deliberately kept separate:
// stats/charts.tsx's donut/bar plot a *count* with an always-shown legend and
// a 4rem label column, these plot *hours* with an inline legend and a 6rem
// label column, and use different inactive-arc opacity — real differences,
// not just styling, so merging them would trade a visible behavior change for
// a cosmetic dedup.

export interface ChartCategory {
  label: string;
  value: number;
  color: string;
}

const fmtHours = (hours: number): string => (Number.isInteger(hours) ? `${hours}` : hours.toFixed(1));

// ── Donut ─────────────────────────────────────────────────────────────────

interface CategoryDonutChartProps {
  categories: ChartCategory[];
  size?: number;
  strokeWidth?: number;
  emptyMessage: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories, size = 120, strokeWidth = 20, emptyMessage,
}) => {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const nonZero = categories.filter(c => c.value > 0);

  if (nonZero.length === 0) {
    return (
      <div className="flex items-center justify-center text-center" style={{ minHeight: '7rem' }}>
        <p className="text-xs sm:text-sm text-text-muted italic">{emptyMessage}</p>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = nonZero.reduce((sum, c) => sum + c.value, 0) || 1;
  const gapLen = nonZero.length > 1 ? 3 : 0;

  const largest = nonZero.reduce((max, c) => (c.value > max.value ? c : max), nonZero[0]);
  const active = nonZero.find(c => c.label === hoveredLabel) ?? largest;
  const activePct = Math.round((active.value / total) * 100);

  const rawLens = nonZero.map(c => (c.value / total) * circumference);
  const arcs = nonZero.map((c, i) => {
    const segLen = Math.max(rawLens[i] - gapLen, 0);
    const startOffset = rawLens.slice(0, i).reduce((sum, len) => sum + len, 0);
    const isActive = c.label === active.label;
    return (
      <circle
        key={c.label}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={c.color}
        strokeWidth={strokeWidth}
        strokeOpacity={isActive ? 1 : 0.3}
        strokeDasharray={`${segLen} ${circumference}`}
        strokeDashoffset={-startOffset}
        onMouseEnter={() => setHoveredLabel(c.label)}
        onMouseLeave={() => setHoveredLabel(null)}
        style={{ transition: 'stroke-opacity var(--tm-dur-slow) var(--tm-ease)', cursor: 'pointer' }}
      >
        <title>{`${c.label}: ${fmtHours(c.value)}h (${Math.round((c.value / total) * 100)}%)`}</title>
      </circle>
    );
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--tm-surface-raised)" strokeWidth={strokeWidth} />
          {arcs}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2">
          <span className="font-bold leading-none" style={{ color: active.color, fontSize: `${Math.max(size * 0.19, 11)}px` }}>
            {activePct}%
          </span>
          <span className="text-text-muted mt-0.5 max-w-full truncate text-center" style={{ fontSize: `${Math.max(size * 0.09, 9)}px` }}>
            {active.label}
          </span>
        </div>
      </div>
      {/* Legend — always shown alongside the donut (2+ categories) so tag
          identity is never color-alone. */}
      <div className="flex flex-col gap-1 min-w-0 flex-1 w-full">
        {nonZero.map(c => (
          <div key={c.label} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-xs text-text-secondary truncate flex-1">{c.label}</span>
            <span className="text-xs font-semibold text-text-primary flex-shrink-0">{fmtHours(c.value)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Horizontal bars ──────────────────────────────────────────────────────

interface CategoryBarsChartProps {
  categories: ChartCategory[];
  emptyMessage: string;
  valueSuffix?: string;
}

export const CategoryBarsChart: React.FC<CategoryBarsChartProps> = ({ categories, emptyMessage, valueSuffix = 'h' }) => {
  const nonZero = categories.filter(c => c.value > 0);

  if (nonZero.length === 0) {
    return (
      <div className="flex items-center justify-center text-center" style={{ minHeight: '5rem' }}>
        <p className="text-xs sm:text-sm text-text-muted italic">{emptyMessage}</p>
      </div>
    );
  }

  const maxValue = Math.max(...nonZero.map(c => c.value));

  return (
    <div className="flex flex-col gap-1.5">
      {nonZero.map((c, i) => (
        <div key={`${c.label}-${i}`} className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: `${i * 35}ms` }}>
          <span className="text-xs text-text-secondary truncate flex-shrink-0" style={{ width: '6rem' }} title={c.label}>
            {c.label}
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tm-surface-raised)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((c.value / maxValue) * 100, 6)}%`,
                backgroundColor: c.color,
                transition: 'width var(--tm-dur-slow) var(--tm-ease)',
              }}
            />
          </div>
          <span className="flex-shrink-0 text-xs font-semibold text-text-primary text-right" style={{ width: '2.5rem' }}>
            {fmtHours(c.value)}{valueSuffix}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Week trend line ──────────────────────────────────────────────────────

export interface DayPoint {
  date: Date;
  hours: number;
  isSelected: boolean;
}

interface WeekTrendLineChartProps {
  days: DayPoint[]; // seven entries, Monday through Sunday
  rangeLabel: string;
}

export const WeekTrendLineChart: React.FC<WeekTrendLineChartProps> = ({ days, rangeLabel }) => (
  <div className="flex flex-col gap-1">
    <p className="text-xs text-text-muted">{rangeLabel}</p>
    <TrendLineChart
      days={days.map(d => ({ date: d.date, hours: d.hours, isToday: d.isSelected }))}
      svgClassName="w-full h-auto"
      ariaLabel={`Estimated hours, ${rangeLabel}`}
    />
  </div>
);
