export interface Habit {
  id: number;
  title: string;
  user_id?: string | null;
  current_streak: number;
  max_streak: number;
  logged_today: boolean;
  tags: { id: number; name: string; color?: string | null }[];
  estimated_time?: number | null;
}

export interface HabitHistoryEntry {
  date: string;   // YYYY-MM-DD
  logged: boolean;
}
