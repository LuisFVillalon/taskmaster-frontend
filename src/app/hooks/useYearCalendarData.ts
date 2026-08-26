import { useEffect, useMemo, useState } from 'react';
import { useTasksContext } from '@/app/context/TasksContext';
import { useHabitsContext } from '@/app/context/HabitsContext';
import { useNotesContext } from '@/app/context/NotesContext';
import { fetchHabitHistory } from '@/app/lib/backend-api';
import { Habit } from '@/app/types/habit';
import { Task } from '@/app/types/task';
import { Note } from '@/app/types/notes';
import { toLocalDateStr } from '@/app/utils/dateUtils';

export interface DayData {
  dateStr: string; // YYYY-MM-DD
  habitsCompleted: Habit[];
  tasksDue: Task[];
  tasksCompleted: Task[];
  estimatedHours: number;
  notesEdited: Note[];
}

/**
 * Aggregates tasks/habits/notes into a per-day map for Jan 1 – today of the
 * current calendar year. Habit completion has no bulk "whole year" endpoint —
 * fetchHabitHistory only returns the past N days counting back from today —
 * so the year is fixed to the current one rather than letting callers page
 * to a different year, where that "past N days" window wouldn't line up
 * with Jan 1 – Dec 31 of that year at all.
 */
export function useYearCalendarData() {
  const year = new Date().getFullYear();
  const { tasks, isLoading: tasksLoading } = useTasksContext();
  const { habits, habitsLoading } = useHabitsContext();
  const { notes, isLoading: notesLoading } = useNotesContext();

  const [habitLogged, setHabitLogged] = useState<Map<number, Set<string>>>(new Map());
  const [habitHistoryLoading, setHabitHistoryLoading] = useState(true);

  useEffect(() => {
    if (habitsLoading) return;

    if (habits.length === 0) {
      setHabitLogged(new Map());
      setHabitHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHabitHistoryLoading(true);

    const today = new Date();
    const jan1 = new Date(year, 0, 1);
    const days = Math.max(1, Math.floor((today.getTime() - jan1.getTime()) / 86400000) + 1);
    const todayStr = toLocalDateStr(today);

    Promise.all(
      habits.map(h => fetchHabitHistory(h.id, days).then(entries => [h.id, entries] as const)),
    )
      .then(results => {
        if (cancelled) return;
        const map = new Map<number, Set<string>>();
        for (const [habitId, entries] of results) {
          const set = new Set(entries.filter(e => e.logged).map(e => e.date));
          // "Today" is tracked authoritatively on the habit object itself
          // (see useHabits/HabitHistoryModal) — keep this map in agreement.
          const habit = habits.find(h => h.id === habitId);
          if (habit?.logged_today) set.add(todayStr);
          else set.delete(todayStr);
          map.set(habitId, set);
        }
        setHabitLogged(map);
      })
      .catch(err => console.error('[useYearCalendarData] Failed to fetch habit history:', err))
      .finally(() => { if (!cancelled) setHabitHistoryLoading(false); });

    return () => { cancelled = true; };
    // habits.length is a reasonable proxy for habit set identity here — a
    // full deep dependency on `habits` would re-fetch history on every
    // logged_today toggle, which is unnecessary since that override is
    // applied locally above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitsLoading, habits.length, year]);

  const dayData = useMemo(() => {
    const map = new Map<string, DayData>();
    const yearPrefix = `${year}-`;

    const ensure = (dateStr: string): DayData => {
      let d = map.get(dateStr);
      if (!d) {
        d = { dateStr, habitsCompleted: [], tasksDue: [], tasksCompleted: [], estimatedHours: 0, notesEdited: [] };
        map.set(dateStr, d);
      }
      return d;
    };

    for (const task of tasks) {
      if (!task.due_date) continue;
      const dateStr = toLocalDateStr(task.due_date);
      if (!dateStr.startsWith(yearPrefix)) continue;
      const d = ensure(dateStr);
      d.tasksDue.push(task);
      d.estimatedHours += task.estimated_time ?? 0;
    }

    for (const task of tasks) {
      if (!task.completed || !task.completed_date) continue;
      const dateStr = toLocalDateStr(task.completed_date);
      if (!dateStr.startsWith(yearPrefix)) continue;
      ensure(dateStr).tasksCompleted.push(task);
    }

    for (const note of notes) {
      const dateStr = toLocalDateStr(new Date(note.updated_date));
      if (!dateStr.startsWith(yearPrefix)) continue;
      ensure(dateStr).notesEdited.push(note);
    }

    for (const habit of habits) {
      const logged = habitLogged.get(habit.id);
      if (!logged) continue;
      for (const dateStr of logged) {
        if (!dateStr.startsWith(yearPrefix)) continue;
        const d = ensure(dateStr);
        d.habitsCompleted.push(habit);
        d.estimatedHours += habit.estimated_time ?? 0;
      }
    }

    return map;
  }, [tasks, notes, habits, habitLogged, year]);

  return {
    year,
    dayData,
    habits,
    loading: tasksLoading || notesLoading || habitsLoading || habitHistoryLoading,
  };
}
