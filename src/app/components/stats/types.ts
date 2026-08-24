import { Task, TagStats } from '@/app/types/task';
import { Note } from '@/app/types/notes';
import { Habit } from '@/app/types/habit';

export type TasksVariant = {
  variant: 'tasks';
  tasks: Task[];
  total: number;
};

export type NotesVariant = {
  variant: 'notes';
  notes: Note[];         // all notes, unsorted
  noteTags: TagStats[];
};

export type HabitsVariant = {
  variant: 'habits';
  habits: Habit[];
  onToggle: (id: number) => void;
  onCreate?: () => void;
  pendingHabitIds?: Set<number>;
  loading?: boolean;
};

export type StatsCardProps = TasksVariant | NotesVariant | HabitsVariant;
