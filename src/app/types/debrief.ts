export interface DebriefTag {
  id: number;
  name: string;
  color: string | null;
}

export interface DebriefTaskItem {
  id: number;
  title: string;
  category: string | null;
  priority: number | null;
  due_date: string | null;
  due_time: string | null;
  estimated_time: number | null;
  tags: DebriefTag[];
}

export interface HabitDebriefStatus {
  id: number;
  title: string;
  current_streak: number;
  max_streak: number;
  logged_today: boolean;
  estimated_time: number | null;
  tags: DebriefTag[];
}

export interface DebriefNoteItem {
  id: number;
  title: string;
  minutes: number;
  tags: DebriefTag[];
}

export interface WorkloadCapacity {
  is_rest_day: boolean;
  available_minutes: number | null;
  committed_minutes: number;
  utilization_pct: number | null;
  is_overcommitted: boolean;
}

export type FocusNextReason = 'high_priority' | 'upcoming_high_effort';

export interface FocusNextItem {
  task_id: number;
  title: string;
  priority: number | null;
  due_date: string | null;
  estimated_time: number | null;
  reason: FocusNextReason;
}

export interface DailyDebriefReport {
  report_date: string;
  overdue_tasks: DebriefTaskItem[];
  due_today_tasks: DebriefTaskItem[];
  completed_today_tasks: DebriefTaskItem[];
  notes_worked_today: DebriefNoteItem[];
  habit_status: HabitDebriefStatus[];
  workload: WorkloadCapacity;
  focus_next: FocusNextItem[];
}
