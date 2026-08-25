'use client';

import React, { useState } from 'react';
import { Calendar, LayoutGrid } from 'lucide-react';
import BigPictureCalendar from '@/app/components/calendar/BigPictureCalendar';
import StatsCard from '@/app/components/stats/StatsCard';
import TimersCard from '@/app/components/stats/TimersCard';
import DraggableGrid from '@/app/components/common/DraggableGrid';
import CalendarSummarySlide from '@/app/components/calendar/CalendarSummarySlide';
import { useGridOrder } from '@/app/hooks/useGridOrder';
import { Habit } from '@/app/types/habit';
import { StatsData, TagStats } from '@/app/types/task';
import { Note } from '@/app/types/notes';
import type { ProfileFields, useProfile } from '@/app/hooks/useProfile';

const GRID_ITEM_IDS = ['calendar', 'timers', 'habits', 'tasks', 'notes'];
const GRID_ORDER_STORAGE_KEY = 'tm-dashboard-grid-order';
// Index of the "bottom" (full-width) slot in `order` — see GRID_SPANS below.
const BOTTOM_INDEX = 4;

// Pill switch with an icon parked at each end — the knob slides to sit on
// top of whichever slide is active, so both destinations stay visible at
// once instead of just the current one.
const TOGGLE_TRACK_CLASS =
  'absolute top-2 right-2 z-30 w-14 h-7 rounded-full border border-border-subtle shadow-sm transition-colors duration-200 flex-shrink-0';
const TOGGLE_KNOB_TRAVEL_PX = 28;

// Column span (of 12) per slot, indexed by position in `order` — not by card
// id — so whichever card lands in a slot after a drag takes that slot's
// span. Falls back to a full-bleed span for any index past the table so an
// added 6th card (or beyond) can never orphan a half-empty row.
const GRID_SPANS = [7, 5, 7, 5, 12];
const SPAN_CLASSES: Record<number, string> = { 5: 'lg:col-span-5', 7: 'lg:col-span-7', 12: 'lg:col-span-12' };
const spanClass = (_id: string, i: number) => SPAN_CLASSES[GRID_SPANS[i] ?? 12] ?? SPAN_CLASSES[12];

interface CalendarAndStatsProps {
  habits: Habit[];
  onToggleHabit: (id: number) => void;
  onCreateHabit: () => void;
  pendingHabitIds?: Set<number>;
  habitsLoading?: boolean;
  stats: StatsData;
  allNotes: Note[];
  noteTags: TagStats[];
  profile: ProfileFields;
  onSaveProfile: ReturnType<typeof useProfile>['saveProfile'];
}

const CalendarAndStats: React.FC<CalendarAndStatsProps> = ({
  habits,
  onToggleHabit,
  onCreateHabit,
  pendingHabitIds,
  habitsLoading,
  stats,
  allNotes,
  noteTags,
  profile,
  onSaveProfile,
}) => {
  const [order, setOrder] = useGridOrder(
    GRID_ORDER_STORAGE_KEY,
    GRID_ITEM_IDS,
    profile.layoutOrder,
    next => { onSaveProfile({ ...profile, layoutOrder: next }); },
  );
  const [slide, setSlide] = useState<'grid' | 'calendar'>('grid');
  const toggleSlide = () => setSlide(s => (s === 'grid' ? 'calendar' : 'grid'));

  const items: Record<string, React.ReactNode> = {
    calendar: (
      <div className="w-full h-full">
        <BigPictureCalendar />
      </div>
    ),
    habits: (
      <StatsCard
        variant="habits"
        habits={habits}
        onToggle={onToggleHabit}
        onCreate={onCreateHabit}
        pendingHabitIds={pendingHabitIds}
        loading={habitsLoading}
      />
    ),
    tasks: (
      <StatsCard
        variant="tasks"
        tasks={stats.total.tasks}
        total={stats.total.tasks.length}
      />
    ),
    notes: (
      <StatsCard
        variant="notes"
        notes={allNotes}
        noteTags={noteTags}
      />
    ),
    timers: <TimersCard profile={profile} />,
  };

  const bottomId = order[BOTTOM_INDEX];

  return (
    <div className="mb-4 sm:mb-6 relative">
      <button
        type="button"
        onClick={toggleSlide}
        aria-label={slide === 'grid' ? 'Show calendar view' : 'Show cards view'}
        title={slide === 'grid' ? 'Show calendar view' : 'Show cards view'}
        className={TOGGLE_TRACK_CLASS}
        style={{
          // Accent is a user-customizable theme color, so it isn't always a
          // safe "on" track shade on its own — some picks are dark enough to
          // wash out the white knob/icon. Lighten it toward white instead of
          // using it at full strength.
          backgroundColor: slide === 'calendar'
            ? 'color-mix(in srgb, var(--tm-accent) 55%, white 45%)'
            : 'var(--tm-border-subtle)',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${slide === 'calendar' ? TOGGLE_KNOB_TRAVEL_PX : 0}px)` }}
        />
        <span className="absolute inset-0.5 flex items-center justify-between pointer-events-none">
          <span className="w-6 h-6 flex items-center justify-center">
            <LayoutGrid className={`w-3.5 h-3.5 transition-colors ${slide === 'grid' ? 'text-white' : 'text-text-muted'}`} />
          </span>
          <span className="w-6 h-6 flex items-center justify-center">
            <Calendar className={`w-3.5 h-3.5 transition-colors ${slide === 'calendar' ? 'text-white' : 'text-text-muted'}`} />
          </span>
        </span>
      </button>

      {slide === 'grid' ? (
        <DraggableGrid
          order={order}
          onReorder={setOrder}
          items={items}
          itemClassName={spanClass}
          className="grid grid-cols-1 lg:grid-cols-12 lg:[grid-auto-flow:row_dense] gap-3 sm:gap-4"
        />
      ) : (
        <CalendarSummarySlide />
      )}

      {slide === 'calendar' && (
        <div className="mt-3 sm:mt-4">
          {items[bottomId]}
        </div>
      )}
    </div>
  );
};

export default CalendarAndStats;
