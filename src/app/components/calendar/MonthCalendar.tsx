'use client';

import React, { useMemo } from 'react';
import { Sun } from 'lucide-react';
import type { DayData } from '@/app/hooks/useYearCalendarData';
import { toLocalDateStr } from '@/app/utils/dateUtils';
import {
  MONTH_NAMES,
  MONTHS,
  MONTH_SHAPES,
  type MonthShape,
  monthCardBg,
  monthBandBg,
  monthShapeColor,
  monthNameColor,
  daylightRailPct,
  formatDaylight,
  formatHours,
  formatHeroDate,
  getHolidays,
} from '@/app/lib/monthPersonality';
import DayCell from './DayCell';

interface MonthCalendarProps {
  year: number;
  month: number; // 0-11
  dayData: Map<string, DayData>;
  todayStr: string;
  onSelectDay: (date: Date) => void;
}

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const shapeStyle = (s: MonthShape, color: string, animate: boolean): React.CSSProperties => ({
  position: 'absolute',
  left: s.l,
  top: s.t,
  width: s.w,
  height: s.h,
  borderRadius: s.r,
  ...(s.ring
    ? { border: `2px solid ${color}`, backgroundColor: 'transparent' }
    : { backgroundColor: color }),
  animation: animate
    ? `${s.anim} ${s.dur}s ${s.anim === 'tm-spin' ? 'linear' : 'ease-in-out'} ${s.delay ?? 0}s infinite`
    : undefined,
});

const MonthCalendar: React.FC<MonthCalendarProps> = ({
  year,
  month,
  dayData,
  todayStr,
  onSelectDay,
}) => {
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // JS getDay() is 0=Sun — shift so the grid starts on Monday.
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

    const result: (Date | null)[] = Array(leadingBlanks).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      result.push(new Date(year, month, day));
    }

    // Always pad to a fixed 6 rows (42 cells) so every month renders the
    // same grid height — some months only need 4-5 rows, which otherwise
    // makes the card shorter and shifts surrounding layout while paging
    // through months.
    while (result.length < 42) {
      result.push(null);
    }

    return result;
  }, [year, month]);

  const monthHolidays = useMemo(() => getHolidays(year)[month] ?? {}, [year, month]);

  const heroSummary = useMemo(() => {
    if (!isCurrent) return null;
    let tasks = 0;
    let hours = 0;
    let habits = 0;
    for (const date of cells) {
      if (!date) continue;
      const d = dayData.get(toLocalDateStr(date));
      if (!d) continue;
      tasks += d.tasksDue.length;
      hours += d.estimatedHours;
      habits += d.habitsCompleted.length;
    }
    return { tasks, hours, habits };
  }, [isCurrent, cells, dayData]);

  const { hue, icon: Icon, daylightHours } = MONTHS[month];
  const shapes = MONTH_SHAPES[month];
  const cardBg = monthCardBg(hue, isCurrent);
  const bandBg = monthBandBg(hue, isCurrent);
  const shapeColor = monthShapeColor(hue, isCurrent);
  const nameColor = monthNameColor(hue);
  const railPct = daylightRailPct(daylightHours);

  return (
    <article
      className="card relative overflow-hidden"
      style={{
        backgroundColor: cardBg,
        boxShadow: isCurrent ? '0 0 0 1.5px var(--tm-accent)' : 'none',
      }}
    >
      <div className="relative overflow-hidden" style={{ height: 34, backgroundColor: bandBg }}>
        {shapes.map((s, i) => (
          <span key={i} className="tm-shape" style={shapeStyle(s, shapeColor, isCurrent)} />
        ))}
        <span
          className="absolute left-0 bottom-0 w-full"
          style={{ height: 3, backgroundColor: 'var(--tm-border-subtle)' }}
        />
        <span
          className="absolute left-0 bottom-0"
          style={{ height: 3, width: `${railPct}%`, backgroundColor: hue }}
        />
      </div>

      <Icon
        aria-hidden
        strokeWidth={1.5}
        size={112}
        color={hue}
        className="tm-watermark pointer-events-none select-none absolute -right-3.5 -bottom-4 opacity-[0.09]"
        style={{ animation: isCurrent ? 'tm-breathe 9s ease-in-out infinite' : undefined }}
      />

      <div className="relative z-10 pt-2.5 px-3 pb-3">
        <header className="flex items-center gap-2 mb-2 px-0.5" style={{ minHeight: 27 }}>
          <h3
            className="font-bold"
            style={{ color: nameColor, fontSize: isCurrent ? 22 : 14, lineHeight: 1.2, letterSpacing: '-0.242px' }}
          >
            {MONTH_NAMES[month]}
          </h3>
          <span
            className="ml-auto flex items-center gap-1 text-[10px] font-medium"
            style={{ color: 'var(--tm-text-secondary)', letterSpacing: '0.12px' }}
            title="Avg amount of daylight per day"
            aria-label={`Average daylight per day: ${formatDaylight(daylightHours)}`}
          >
            <Sun size={10} strokeWidth={2} aria-hidden />
            {formatDaylight(daylightHours)}
          </span>
        </header>

        <div
          className="flex items-center gap-2 flex-wrap mx-0.5 mb-2.5 pb-2.5"
          style={{
            minHeight: 26,
            borderBottom: isCurrent && heroSummary ? '1px solid var(--tm-border-subtle)' : '1px solid transparent',
            visibility: isCurrent && heroSummary ? 'visible' : 'hidden',
          }}
        >
          {isCurrent && heroSummary && (
            <>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium leading-none"
                style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
              >
                Today · {formatHeroDate(todayStr)}
              </span>
              <span className="text-xs" style={{ color: 'var(--tm-text-secondary)' }}>
                {heroSummary.tasks} tasks due · {formatHours(heroSummary.hours)}h estimated · {heroSummary.habits} habit logs
              </span>
            </>
          )}
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="py-0.5 text-center text-[9px] font-semibold text-text-muted"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((date, i) => {
            if (!date) {
              return <div key={`blank-${i}`} style={{ minHeight: 60 }} />;
            }

            const dateStr = toLocalDateStr(date);

            return (
              <DayCell
                key={dateStr}
                date={date}
                data={dayData.get(dateStr)}
                isToday={dateStr === todayStr}
                onSelect={onSelectDay}
                hue={hue}
                holidayName={monthHolidays[date.getDate()]}
              />
            );
          })}
        </div>
      </div>
    </article>
  );
};

export default MonthCalendar;
