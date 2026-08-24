'use client';

import React from 'react';
import { TasksProvider } from './TasksContext';
import { TagsProvider } from './TagsContext';
import { HabitsProvider } from './HabitsContext';
import { NotesProvider } from './NotesContext';

/**
 * Mounted once in the root layout, inside <AuthProvider> — the only place
 * that survives client-side navigation between "/", "/calendar", and
 * "/notes". Before this, TaskManager, useYearCalendarData (used by both the
 * dashboard's calendar slide and the /calendar page), and NotesView each
 * independently called useTasks/useTags/useHabits/useNotes, hitting the
 * backend fresh on every mount — 3-4x redundant fetches of the same data
 * per session. Consumers now read via useTasksContext/useTagsContext/
 * useHabitsContext/useNotesContext instead of calling those hooks directly.
 *
 * Four separate contexts rather than one merged value — a merged context
 * would re-render every consumer whenever any single domain's state changes
 * (e.g. typing in a note title would re-render the calendar grid), which
 * today's independent-hook architecture doesn't couple together.
 */
export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TasksProvider>
    <TagsProvider>
      <HabitsProvider>
        <NotesProvider>
          {children}
        </NotesProvider>
      </HabitsProvider>
    </TagsProvider>
  </TasksProvider>
);
