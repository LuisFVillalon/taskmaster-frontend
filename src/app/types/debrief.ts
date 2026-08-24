export interface TaskDebrief {
  overdue_tasks: string[] | string | null;
  tasks_due_today: string[] | string | null;
  task_recommendations: string[] | string | null;
  remaining_habits: string[] | string | null;
  future_horizon_warning: string[] | string | null;
  workload_analysis: string[] | string | null;
}
