import { Task } from '@/app/types/task';

// ── Priority ───────────────────────────────────────────────────────────────────

export const PRIORITY_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#dc2626', text: '#ffffff' },
  2: { bg: '#ea580c', text: '#ffffff' },
  3: { bg: '#f97316', text: '#ffffff' },
  4: { bg: '#f59e0b', text: '#ffffff' },
  5: { bg: '#eab308', text: '#ffffff' },
};

const DEFAULT_PRIORITY_COLOR = { bg: '#2563eb', text: '#ffffff' };
const NULL_PRIORITY_COLOR = { bg: 'var(--tm-surface-raised)', text: 'var(--tm-text-muted)' };

export function getPriorityStyle(priority: number | null) {
  if (priority === null) return NULL_PRIORITY_COLOR;
  return PRIORITY_COLORS[priority] ?? DEFAULT_PRIORITY_COLOR;
}

export function getDueDateColor(due: string | Date | null, completed: boolean): string {
  if (!due || completed) return 'var(--tm-text-muted)';
  const dueDate = typeof due === 'string' ? new Date(due + 'T00:00:00') : new Date(due);
  const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '#b91c1c';
  if (diffDays <= 3) return '#a16207';
  return '#15803d';
}

export function formatDueDateShort(due: string | Date | null): string | null {
  if (!due) return null;
  const d = typeof due === 'string' ? new Date(due + 'T00:00:00') : due;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const formatDueDate = (
  date: string | Date | null | undefined,
  time?: string | null  // e.g. "23:59"
): string => {
  if (!date) return "No date";

  let dueDate: Date;

  if (typeof date === "string") {
    const parts = date.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      dueDate = new Date(year, month - 1, day);
    } else {
      dueDate = new Date(date);
    }
  } else {
    dueDate = new Date(date);
  }

  if (isNaN(dueDate.getTime())) return "Invalid date";

  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    dueDate.setHours(hours, minutes, 59, 999);
  } else {
    dueDate.setHours(23, 59, 59, 999); // fallback to end of day
  }

  const now = new Date();
  const diffDays = Math.round(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  const isThisYear = dueDate.getFullYear() === now.getFullYear();

  return dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  });
};

export const getTaskDateTime = (task: Task): number => {
  // If no due date at all → push to end
  if (!task.due_date) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Normalize date
  const dateStr =
    typeof task.due_date === 'string'
      ? task.due_date
      : task.due_date instanceof Date
      ? task.due_date.toISOString().split('T')[0]
      : null;

  if (!dateStr) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Normalize time (optional)
  const timeStr =
    typeof task.due_time === 'string'
      ? task.due_time
      : task.due_time instanceof Date
      ? task.due_time.toTimeString().slice(0, 5)
      : '23:59'; // no time → end of day

  const timestamp = new Date(`${dateStr}T${timeStr}`).getTime();

  return isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

export const countTasksByTag = (tasks: Task[]) => {
  const map: Record<number, { name: string; color: string; count: number }> = {};
  tasks.forEach(task => {
    task.tags?.forEach(tag => {
      if (!map[tag.id]) {
        map[tag.id] = {
          name: tag.name,
          color: tag.color,
          count: 0
        };
      }
      map[tag.id].count += 1;
    });
  });

  return Object.values(map);
};

export const getDueColor = (dueDate?: string | Date | null) => {
  if (!dueDate) return "text-gray-400 bg-gray-50";

  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "text-red-700 bg-red-50";
  if (diffDays <= 3) return "text-yellow-700 bg-yellow-50";
  return "text-green-700 bg-green-50";
};

export const getDurationColor = (hours?: number | null) => {
  if (hours == null) return "text-gray-500 bg-gray-50";
  if (hours <= 2.5) return "text-green-700 bg-green-50";
  if (hours <= 5) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
};

export const getComplexityColor = (level?: number | null) => {
  if (level == null) return "text-gray-500 bg-gray-50";
  if (level <= 2) return "text-green-700 bg-green-50";
  if (level <= 4) return "text-yellow-700 bg-yellow-50";
  return "text-red-700 bg-red-50";
};

export const formatTime12Hour = (time?: string | null) => {
  if (!time) return "--:--";

  const [hours, minutes] = time.split(":");

  const hourNum = Number(hours);
  const minuteNum = Number(minutes);

  const period = hourNum >= 12 ? "PM" : "AM";
  const adjustedHour = hourNum % 12 || 12; // converts 0 → 12

  return `${adjustedHour}:${minuteNum.toString().padStart(2, "0")} ${period}`;
};