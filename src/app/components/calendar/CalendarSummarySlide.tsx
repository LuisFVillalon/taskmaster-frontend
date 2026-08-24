'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useYearCalendarData } from '@/app/hooks/useYearCalendarData';
import { toLocalDateStr } from '@/app/utils/dateUtils';
import MonthCarousel from './MonthCarousel';
import DaySummaryPanel from './DaySummaryPanel';

/** Single pulsing placeholder block — mirrors BigPictureCalendar's skeleton. */
const Bone: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-sm ${className}`} style={{ backgroundColor: 'var(--tm-border-subtle)' }} />
);

/**
 * Pixel-approximate skeleton of the MonthCarousel + DaySummaryPanel pair,
 * shown while useYearCalendarData aggregates a year's worth of tasks/habits/
 * notes — that fetch is noticeably slower than the rest of the dashboard, so
 * a plain pulsing box read as "stuck" rather than "loading".
 */
const CalendarSummarySkeleton: React.FC = () => (
  <div className="flex flex-col lg:flex-row gap-4 items-stretch">
    <div className="lg:flex-1 lg:min-w-0 flex items-center gap-1.5 sm:gap-2">
      <ChevronLeft className="w-5 h-5 text-text-muted opacity-30 flex-shrink-0" />
      <div className="flex-1 min-w-0 card overflow-hidden">
        <Bone className="h-[34px] w-full rounded-none" />
        <div className="pt-2.5 px-3 pb-3">
          <div className="flex items-center gap-2 mb-2" style={{ minHeight: 27 }}>
            <Bone className="h-5 w-20" />
            <Bone className="h-3 w-14 ml-auto" />
          </div>
          <div className="flex items-center gap-2 mb-2.5" style={{ minHeight: 26 }}>
            <Bone className="h-5 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {Array.from({ length: 7 }, (_, i) => <Bone key={i} className="h-3" />)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: 35 }, (_, i) => <Bone key={i} className="h-[60px]" />)}
          </div>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-text-muted opacity-30 flex-shrink-0" />
    </div>

    <div className="lg:flex-1 lg:min-w-0">
      <div className="card h-full p-4 sm:p-5 flex flex-col gap-4">
        <Bone className="h-5 w-2/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }, (_, i) => <Bone key={i} className="h-14 rounded-lg" />)}
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 3 }, (_, i) => <Bone key={i} className="h-9 rounded-md" />)}
        </div>
        <Bone className="h-32 rounded-lg" />
      </div>
    </div>
  </div>
);

/**
 * Calendar + day-summary pair used as the dashboard carousel's alternate
 * slide — the same pairing as the /calendar page's own carousel view, minus
 * that page's chrome (no month-grid toggle, no header). Not draggable: it
 * replaces the reorderable card grid rather than joining it.
 */
const CalendarSummarySlide: React.FC = () => {
  const { year, dayData, habits, loading } = useYearCalendarData();
  const [carouselDate, setCarouselDate] = useState<Date | null>(() => new Date());
  const todayStr = toLocalDateStr(new Date());

  if (loading) {
    return <CalendarSummarySkeleton />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch">
      <div className="lg:flex-1 lg:min-w-0">
        <MonthCarousel
          year={year}
          dayData={dayData}
          todayStr={todayStr}
          onSelectDay={setCarouselDate}
        />
      </div>
      <div className="lg:flex-1 lg:min-w-0">
        <DaySummaryPanel
          date={carouselDate}
          data={carouselDate ? dayData.get(toLocalDateStr(carouselDate)) : undefined}
          totalHabits={habits.length}
          dayData={dayData}
          variant="widget"
        />
      </div>
    </div>
  );
};

export default CalendarSummarySlide;
