import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchHabits, toggleHabitDate, verifyHabitStreaks } from '@/app/lib/backend-api';
import { Habit } from '@/app/types/habit';
import { toLocalDateStr } from '@/app/utils/dateUtils';

/**
 * @param enabled - Set false to skip the initial fetch (e.g. no signed-in
 * user yet) — called from HabitsProvider (context/HabitsContext.tsx), which
 * gates this on auth so pages outside the signed-in app never fire it.
 */
export function useHabits(enabled: boolean) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);
  // Toggles read-modify-write the streak server-side, so overlapping requests
  // for the same habit (rapid double-clicks) can race and land out of order,
  // corrupting current_streak. pendingIds blocks a habit from being toggled
  // again until its in-flight request settles. Ref is the synchronous guard;
  // state just mirrors it so the UI can show/disable the pending habit.
  const pendingRef = useRef<Set<number>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      await verifyHabitStreaks();
      const data = await fetchHabits();
      setHabits(data);
    } catch (err) {
      console.error('[useHabits] Failed to load habits:', err);
    } finally {
      setHabitsLoading(false);
    }
  }, []);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  const toggleDate = useCallback(async (id: number, date: string) => {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);
    setPendingIds(new Set(pendingRef.current));

    // toggle-habit-date recalculates current_streak/max_streak correctly, but
    // its logged_today field reflects the server's clock, which can be a
    // different calendar day than the client's local date — trusting it was
    // why the checkbox saved correctly but visually flipped back and forth.
    // So when the toggled date is today (client-side), keep our own
    // optimistic flip instead of the response's logged_today.
    const isToday = date === toLocalDateStr(new Date());
    let optimisticLoggedToday = false;

    if (isToday) {
      setHabits(prev =>
        prev.map(h => {
          if (h.id !== id) return h;
          optimisticLoggedToday = !h.logged_today;
          return { ...h, logged_today: optimisticLoggedToday };
        }),
      );
    }

    try {
      const updated = await toggleHabitDate(id, date);
      setHabits(prev =>
        prev.map(h =>
          h.id === id ? { ...updated, logged_today: isToday ? optimisticLoggedToday : updated.logged_today } : h,
        ),
      );
    } catch (err) {
      console.error('[useHabits] Failed to toggle habit date:', err);
      load();
    } finally {
      pendingRef.current.delete(id);
      setPendingIds(new Set(pendingRef.current));
    }
  }, [load]);

  // The "today" checkbox (habit stats card) always targets the client's own
  // local date, routed through the same toggleDate path as the history
  // calendar — so both surfaces agree on what "today" means and stay in sync.
  const toggle = useCallback((id: number) => toggleDate(id, toLocalDateStr(new Date())), [toggleDate]);

  return { habits, habitsLoading, toggle, toggleDate, pendingHabitIds: pendingIds, refetch: load };
}
