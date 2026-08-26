'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { fetchCalendarSettings, updateCalendarSettings } from '@/app/lib/backend-api';
import type { CalendarSettings } from '@/app/types/calendar';

const DEFAULTS: Omit<CalendarSettings, 'id'> = {
  title: 'Term Tracker',
  start_date: '2026-01-01',
  end_date: '2026-03-31',
};

/**
 * Single source of truth for Term Tracker (the `calendar_settings` table) —
 * call this once (in TaskManager) and thread `calendarSettings`/
 * `saveCalendarSettings` down to whatever needs them (Settings, the
 * dashboard widget, ...) rather than calling it from every consumer, so a
 * save in one place is immediately reflected everywhere else. Mirrors
 * useProfile.ts.
 */
export function useCalendarSettings(user: User | null) {
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({ id: 0, ...DEFAULTS });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchCalendarSettings();
        if (!cancelled && data !== null) setCalendarSettings(data);
      } catch {
        // network / auth error — keep showing defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const saveCalendarSettings = useCallback(async (changes: Partial<Omit<CalendarSettings, 'id'>>): Promise<CalendarSettings> => {
    const updated = await updateCalendarSettings(changes);
    setCalendarSettings(updated);
    return updated;
  }, []);

  return { calendarSettings, loading, saveCalendarSettings };
}
