'use client';

import React from 'react';
import BigPictureCalendar from '@/app/components/BigPictureCalendar';
import StatsCard from '@/app/components/StatsCard';
import { Habit } from '@/app/lib/backend-api';
import { StatsData, TagStats } from '@/app/types/task';
import { Note } from '@/app/types/notes';

interface CalendarAndStatsProps {
  habits: Habit[];
  onToggleHabit: (id: number) => void;
  onCreateHabit: () => void;
  onViewHabitHistory: (id: number) => void;
  stats: StatsData;
  allNotes: Note[];
  noteTags: TagStats[];
}

const CalendarAndStats: React.FC<CalendarAndStatsProps> = ({
  habits,
  onToggleHabit,
  onCreateHabit,
  onViewHabitHistory,
  stats,
  allNotes,
  noteTags,
}) => {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6'>
      <div className="w-full">
        <BigPictureCalendar />
      </div>

      <div className="w-full lg:w-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-4">
        <StatsCard
          variant="habits"
          habits={habits}
          onToggle={onToggleHabit}
          onCreate={onCreateHabit}
          onViewHistory={onViewHabitHistory}
        />
        <StatsCard
          variant="tasks"
          total={stats.total.tasks.length}
          completed={stats.completed.tasks.length}
          active={stats.active.tasks.length}
          topPriority={stats.prioritized.tasks.length}
          activeTags={stats.active.tags}
          completedTags={stats.completed.tags}
          prioritizedTags={stats.prioritized.tags}
        />
        <StatsCard
          variant="notes"
          noteCount={allNotes.length}
          taggedCount={allNotes.filter(n => n.tags.length > 0).length}
          noteTags={noteTags}
        />
      </div>
    </div>
  );
};

export default CalendarAndStats;
