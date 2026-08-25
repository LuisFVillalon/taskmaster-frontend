'use client';

import React, { useEffect, useState } from 'react';
import { Check, Cuboid, Flame, Repeat, Star } from 'lucide-react';
import { fetchHabitHistory } from '@/app/lib/backend-api';
import { Habit, HabitHistoryEntry } from '@/app/types/habit';
import { toLocalDateStr } from '@/app/utils/dateUtils';
import { CardShell } from './CardShell';
import { ProgressRing } from './charts';
import type { HabitsVariant } from './types';

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
      aria-label={`View 90-day heatmap for ${habit.title}`}
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
    <div className="flex flex-col gap-2 w-full min-w-0">
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

// Broken out from the main StatsCard switch so its hooks (selected heatmap
// habit) stay unconditional — StatsCard's `habits` branch just renders this
// rather than calling hooks inline.
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
          <div className="flex-1 min-h-0 flex items-center justify-center">
            {heatmapHabit && <HabitHeatmap habit={heatmapHabit} />}
          </div>
        </div>
      )}
    </CardShell>
  );
};

export default HabitsStatsCard;
