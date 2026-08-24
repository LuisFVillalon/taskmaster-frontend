'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Pencil, AlertCircle, Calendar, Briefcase, Sun } from 'lucide-react';
import { CalendarSettings } from '@/app/types/calendar';
import {
  fetchCalendarSettings,
  updateCalendarSettings,
} from '@/app/lib/backend-api';

// ── Defaults used as fallback while settings are loading ──────────────────────
const DEFAULTS: Omit<CalendarSettings, 'id'> = {
  title: 'Big Picture Calendar',
  sub_header: 'First Quarter',
  start_date: '2026-01-01',
  end_date: '2026-03-31',
};

// Progress ring geometry — constant regardless of percentage.
const CIRCLE_SIZE = 128;
const CIRCLE_STROKE = 10;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const isWeekday = (dayOfWeek: number) => dayOfWeek >= 1 && dayOfWeek <= 5;
const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

// Inclusive count of calendar days between `from` and `to` (dates only, time
// ignored) whose day-of-week matches `predicate` — used to split the days
// remaining in the range into weekdays vs. weekend days.
const countDaysMatching = (from: Date, to: Date, predicate: (dayOfWeek: number) => boolean): number => {
  let count = 0;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const endTime = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  while (cursor.getTime() <= endTime) {
    if (predicate(cursor.getDay())) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

// ── Countdown stat tile ─────────────────────────────────────────────────────

interface CountdownStatTileProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  subLabel: 'Completed' | 'Remaining';
  color: string;
  bg: string;
}

// Header row (icon + title) / large number / muted uppercase sub-label tag,
// stacked in that order — used for the four Days In / Weeks / Workdays /
// Weekends tiles below the hero countdown.
const CountdownStatTile: React.FC<CountdownStatTileProps> = ({ icon, title, value, subLabel, color, bg }) => (
  <div
    className="p-3 rounded-lg border border-border-subtle flex flex-col gap-1"
    style={{ backgroundColor: bg }}
  >
    <span className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold" style={{ color }}>
      {icon}
      {title}
    </span>
    <span className="text-xl sm:text-2xl font-bold leading-none text-text-primary">{value}</span>
    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-text-muted">
      {subLabel}
    </span>
  </div>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

/** Single pulsing placeholder block. All skeleton shapes are built from this. */
const Bone: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded-sm ${className}`}
    style={{ backgroundColor: 'var(--tm-border-subtle)' }}
  />
);

/**
 * Pixel-accurate skeleton of BigPictureCalendar.
 * Preserves every section's dimensions so the layout never shifts when real
 * data arrives.
 */
const BigPictureCalendarSkeleton: React.FC = () => (
  <div className="card w-full max-w-4xl mx-auto h-full p-6 flex flex-col gap-5">

    {/* Header */}
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <Bone className="h-3 w-24 mb-2" />
        <Bone className="h-8 w-3/5" />
      </div>
    </div>

    {/* Hero headline + countdown */}
    <div className="flex flex-col gap-3">
      <Bone className="h-6 w-2/3" />
      <Bone className="h-14 w-40" />
    </div>

    {/* Progress bar */}
    <div>
      <Bone className="h-2.5 w-full rounded-full" />
      <div className="flex justify-between mt-1.5">
        <Bone className="h-3 w-16" />
        <Bone className="h-3 w-20" />
      </div>
    </div>

    {/* Stat tiles */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="p-3 rounded-lg border border-border-subtle"
          style={{ backgroundColor: 'var(--tm-surface-raised)' }}
        >
          <Bone className="h-3 w-16 mb-2" />
          <Bone className="h-6 w-10" />
        </div>
      ))}
    </div>

    {/* Date Range Inputs */}
    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-subtle">
      {[0, 1].map(i => (
        <div key={i}>
          <Bone className="h-3 w-16 mb-1.5" />
          <Bone className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const BigPictureCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [fadeIn, setFadeIn]     = useState(false);
  const [editingField, setEditingField] = useState<'title' | 'sub_header' | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const subHeaderInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch settings on mount ────────────────────────────────────────────────
  // fetchCalendarSettings returns null for new users (HTTP 404 → no DB row yet).
  // In that case we leave `settings` as null so the component renders DEFAULTS
  // locally without writing anything to the database. The first time the user
  // edits a field, scheduleAutoSave fires and the PATCH endpoint creates the row.
  useEffect(() => {
    fetchCalendarSettings()
      .then(data => { if (data !== null) setSettings(data); })
      .catch(() => { /* network / auth error — keep showing DEFAULTS */ })
      .finally(() => {
        setLoading(false);
        // Double rAF: React commits the opacity-0 real content on the first
        // frame; the second frame triggers the transition to opacity-100.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setFadeIn(true)),
        );
      });
  }, []);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (editingField === 'title') titleInputRef.current?.select();
    if (editingField === 'sub_header') subHeaderInputRef.current?.select();
  }, [editingField]);

  // ── Midnight date updater ──────────────────────────────────────────────────
  useEffect(() => {
    const updateDate = () => setCurrentDate(new Date());
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    const timeout = setTimeout(() => {
      updateDate();
      const interval = setInterval(updateDate, 24 * 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, timeUntilMidnight);
    return () => clearTimeout(timeout);
  }, []);

  // ── Auto-save with 800 ms debounce ────────────────────────────────────────
  const scheduleAutoSave = (updated: CalendarSettings) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        const saved = await updateCalendarSettings({
          title: updated.title,
          sub_header: updated.sub_header,
          start_date: updated.start_date,
          end_date: updated.end_date,
        });
        setSettings(saved);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 800);
  };

  const updateField = <K extends keyof CalendarSettings>(key: K, value: CalendarSettings[K]) => {
    const base = settings ?? { id: 0, ...DEFAULTS };
    const updated = { ...base, [key]: value };
    setSettings(updated);
    scheduleAutoSave(updated);
  };

  // ── Computed progress ─────────────────────────────────────────────────────
  const progress = useMemo(() => {
    if (!settings) return null;
    const start = parseLocalDate(settings.start_date);
    const end = parseLocalDate(settings.end_date);
    // Normalize to midnight local time — `currentDate` carries a real
    // time-of-day, and mixing that with the midnight-only start/end dates
    // in day-count math is what caused daysRemaining to drift a day off
    // from the workday/weekend breakdown below.
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    if (today < start || today > end) return null;

    const msDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.round((end.getTime() - start.getTime()) / msDay);
    const daysInto = Math.floor((today.getTime() - start.getTime()) / msDay);
    const weekNumber = Math.min(Math.floor(daysInto / 7) + 1, Math.ceil(totalDays / 7));
    const totalWeeks = Math.ceil(totalDays / 7);
    const pct = Math.round((daysInto / totalDays) * 100);
    // Derive daysRemaining directly from the workday/weekend breakdown so
    // the two are guaranteed to sum to the exact same total.
    const businessDaysRemaining = countDaysMatching(today, end, isWeekday);
    const weekendDaysRemaining = countDaysMatching(today, end, isWeekend);
    const daysRemaining = businessDaysRemaining + weekendDaysRemaining;
    const weeksRemaining = Math.ceil(daysRemaining / 7);

    return {
      totalDays, daysInto, daysRemaining, weekNumber, totalWeeks, pct, start, end,
      weeksRemaining, businessDaysRemaining, weekendDaysRemaining,
    };
  }, [settings, currentDate]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <BigPictureCalendarSkeleton />;

  const cur = settings ?? { id: 0, ...DEFAULTS };

  const saveIndicator = (
    <span className="text-xs font-medium flex-shrink-0" style={{
      color: saveStatus === 'saved' ? 'var(--tm-success)'
           : saveStatus === 'error' ? 'var(--tm-danger)'
           : 'var(--tm-text-muted)',
    }}>
      {saveStatus === 'saving' && 'Saving…'}
      {saveStatus === 'saved' && '✓ Saved'}
      {saveStatus === 'error' && '⚠ Save failed'}
    </span>
  );

  return (
    <div
      className={`card w-full max-w-4xl mx-auto h-full p-6 flex flex-col gap-5 transition-opacity duration-500 ease-out ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
    >

      {/* flex-1 + justify-center: the card stretches to match whatever
          taller neighbor shares its grid row (draggable grid), and the
          header/hero/stat-tiles block is a fixed height — centering it in
          the available space keeps any leftover height as balanced
          top/bottom margin instead of stranding it below the date-range
          footer, which should stay pinned to the card's bottom edge. */}
      <div className="flex-1 flex flex-col justify-center gap-5">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editingField === 'sub_header' ? (
              <input
                ref={subHeaderInputRef}
                value={cur.sub_header}
                onChange={e => updateField('sub_header', e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={e => e.key === 'Enter' && setEditingField(null)}
                className="text-xs font-semibold uppercase tracking-wide bg-transparent border-b outline-none w-full mb-1"
                style={{ color: 'var(--tm-text-muted)', borderColor: 'var(--tm-border-subtle)' }}
              />
            ) : (
              <button
                onClick={() => setEditingField('sub_header')}
                className="group flex items-center gap-1 text-left mb-1"
                title="Click to edit"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {cur.sub_header}
                </span>
                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity text-text-muted flex-shrink-0" />
              </button>
            )}

            {editingField === 'title' ? (
              <input
                ref={titleInputRef}
                value={cur.title}
                onChange={e => updateField('title', e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={e => e.key === 'Enter' && setEditingField(null)}
                className="text-2xl sm:text-3xl font-bold bg-transparent border-b-2 outline-none w-full"
                style={{ color: 'var(--tm-text-primary)', borderColor: 'var(--tm-accent)' }}
              />
            ) : (
              <button
                onClick={() => setEditingField('title')}
                className="group flex items-center gap-2 text-left w-full min-w-0"
                title="Click to edit"
              >
                <h1 className="text-2xl sm:text-3xl font-bold truncate" style={{ color: 'var(--tm-text-primary)' }}>
                  {cur.title}
                </h1>
                <Pencil
                  className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0 text-text-muted"
                />
              </button>
            )}
          </div>
          {saveIndicator}
        </div>

        {progress ? (
          <>
            {/* ── Hero: headline + countdown (left) / progress ring (right) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="flex flex-col gap-3">
                <p className="text-lg sm:text-xl font-semibold text-text-primary flex items-center flex-wrap gap-2">
                  You&rsquo;re in
                  <span
                    className="chip font-bold"
                    style={{ backgroundColor: 'var(--tm-accent)', color: 'var(--tm-accent-text)' }}
                  >
                    Week {progress.weekNumber} of {progress.totalWeeks}
                  </span>
                </p>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span
                    className="text-5xl sm:text-6xl font-bold leading-none"
                    style={{ color: 'var(--tm-accent)' }}
                  >
                    {progress.daysRemaining}
                  </span>
                  <span className="text-sm sm:text-base text-text-secondary font-medium">
                    {progress.daysRemaining === 1 ? 'day left' : 'days left'} until {formatDate(progress.end)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 justify-self-center">
                <div className="relative" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
                  <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="-rotate-90">
                    <circle
                      cx={CIRCLE_SIZE / 2}
                      cy={CIRCLE_SIZE / 2}
                      r={CIRCLE_RADIUS}
                      fill="none"
                      stroke="var(--tm-surface-raised)"
                      strokeWidth={CIRCLE_STROKE}
                    />
                    <circle
                      cx={CIRCLE_SIZE / 2}
                      cy={CIRCLE_SIZE / 2}
                      r={CIRCLE_RADIUS}
                      fill="none"
                      stroke="var(--tm-accent)"
                      strokeWidth={CIRCLE_STROKE}
                      strokeLinecap="round"
                      strokeDasharray={CIRCLE_CIRCUMFERENCE}
                      strokeDashoffset={CIRCLE_CIRCUMFERENCE * (1 - progress.pct / 100)}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="text-2xl sm:text-3xl font-bold leading-none"
                      style={{ color: 'var(--tm-accent)' }}
                    >
                      {progress.pct}%
                    </span>
                    <span className="text-[10px] text-text-muted font-medium mt-1">complete</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stat tiles + live countdown ───────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CountdownStatTile
                icon={<Calendar className="w-3.5 h-3.5" />}
                title="Days In"
                value={progress.daysInto}
                subLabel="Completed"
                color="var(--tm-accent-2)"
                bg="var(--tm-accent-2-subtle)"
              />
              <CountdownStatTile
                icon={<Calendar className="w-3.5 h-3.5" />}
                title="Weeks"
                value={progress.weeksRemaining}
                subLabel="Remaining"
                color="var(--tm-warning)"
                bg="var(--tm-warning-subtle)"
              />
              <CountdownStatTile
                icon={<Briefcase className="w-3.5 h-3.5" />}
                title="Weekdays"
                value={progress.businessDaysRemaining}
                subLabel="Remaining"
                color="var(--tm-success)"
                bg="var(--tm-success-subtle)"
              />
              <CountdownStatTile
                icon={<Sun className="w-3.5 h-3.5" />}
                title="Weekends"
                value={progress.weekendDaysRemaining}
                subLabel="Remaining"
                color="var(--tm-accent)"
                bg="var(--tm-accent-subtle)"
              />
            </div>
          </>
        ) : (
          <div
            className="p-5 rounded-lg border border-border-subtle flex items-start gap-3"
            style={{ backgroundColor: 'var(--tm-surface-raised)' }}
          >
            <AlertCircle className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-text-primary mb-0.5">Not Currently In Session</h2>
              <p className="text-sm text-text-muted">
                Today ({formatDate(currentDate)}) is outside the configured date range. Adjust the dates below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Date Range Inputs ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-subtle">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Start Date</label>
          <input
            type="date"
            value={cur.start_date}
            onChange={e => updateField('start_date', e.target.value)}
            className="input-field text-sm w-full"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">End Date</label>
          <input
            type="date"
            value={cur.end_date}
            onChange={e => updateField('end_date', e.target.value)}
            className="input-field text-sm w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default BigPictureCalendar;
