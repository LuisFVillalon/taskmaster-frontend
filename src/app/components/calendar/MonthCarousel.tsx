'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayData } from '@/app/hooks/useYearCalendarData';
import MonthCalendar from './MonthCalendar';

interface MonthCarouselProps {
  year: number;
  dayData: Map<string, DayData>;
  todayStr: string;
  onSelectDay: (date: Date) => void;
}

const ARROW_CLASS =
  'p-1.5 rounded text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none flex-shrink-0';

// Single-month carousel over `year` — arrows step the displayed month back
// and forth, wrapping around at the ends (December -> January and back).
const MonthCarousel: React.FC<MonthCarouselProps> = ({ year, dayData, todayStr, onSelectDay }) => {
  const [month, setMonth] = useState(() => new Date().getMonth());

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => setMonth(m => (m + 11) % 12)}
        aria-label="Previous month"
        className={ARROW_CLASS}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <MonthCalendar
          year={year}
          month={month}
          dayData={dayData}
          todayStr={todayStr}
          onSelectDay={onSelectDay}
        />
      </div>

      <button
        type="button"
        onClick={() => setMonth(m => (m + 1) % 12)}
        aria-label="Next month"
        className={ARROW_CLASS}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default MonthCarousel;
