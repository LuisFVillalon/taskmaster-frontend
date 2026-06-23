import { useState, useEffect, useCallback } from 'react';
import { fetchHabits, toggleHabit, toggleHabitDate, verifyHabitStreaks, Habit } from '@/app/lib/backend-api';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(true);

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

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (id: number) => {
    // Optimistic update
    setHabits(prev =>
      prev.map(h =>
        h.id === id
          ? {
              ...h,
              logged_today: !h.logged_today,
              current_streak: h.logged_today
                ? Math.max(0, h.current_streak - 1)
                : h.current_streak + 1,
            }
          : h,
      ),
    );
    try {
      const updated = await toggleHabit(id);
      setHabits(prev => prev.map(h => (h.id === id ? updated : h)));
    } catch (err) {
      console.error('[useHabits] Failed to toggle habit:', err);
      load();
    }
  }, [load]);

  const toggleDate = useCallback(async (id: number, date: string) => {
    try {
      const updated = await toggleHabitDate(id, date);
      setHabits(prev => prev.map(h => (h.id === id ? updated : h)));
    } catch (err) {
      console.error('[useHabits] Failed to toggle habit date:', err);
      load();
    }
  }, [load]);

  return { habits, habitsLoading, toggle, toggleDate, refetch: load };
}
