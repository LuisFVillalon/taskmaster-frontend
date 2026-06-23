/*
 * Backend API client — all requests to the FastAPI backend (taskmaster-backend).
 *
 * Every request is authenticated via the Supabase JWT:
 *   Authorization: Bearer <access_token>
 *
 * The token is retrieved from the active Supabase session. If there is no
 * session the call throws so the caller can redirect to /login.
 */

import { Task, WorkBlock } from "../types/task";
import { Note } from "../types/notes";
import { CalendarSettings } from "../types/calendar";
import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_TASKMASTER_DB_URL!;

// ── Auth header helper ────────────────────────────────────────────────────────

/** Builds Authorization headers from the active Supabase session. Throws if unauthenticated. */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated — no active Supabase session.");
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  };
}

/** Throws a descriptive error if the response is not 2xx. */
async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? JSON.stringify(body);
    } catch {
      // body wasn't JSON
    }
    throw new Error(`[${context}] ${detail}`);
  }
}

// ── Claim orphaned data ───────────────────────────────────────────────────────

/**
 * Assigns all database rows where user_id IS NULL to the currently
 * authenticated user.  Safe to call multiple times — already-owned rows are
 * never touched.  Returns the count of rows claimed per table.
 *
 * Called automatically:
 *   • On every successful sign-in / OAuth callback
 *   • Once on TaskManager mount (via per-user localStorage flag) so existing
 *     signed-in accounts are fixed without requiring a re-login.
 */
export async function claimOrphanedData(): Promise<{
  tasks: number;
  notes: number;
  tags: number;
  calendar_settings: number;
} | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/claim-data`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body.claimed ?? null;
  } catch {
    return null;
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

/** Fetches all tasks belonging to the authenticated user. */
export async function fetchTasks() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/get-tasks`, { headers });
  await assertOk(res, "fetchTasks");
  return res.json();
}

/** Creates a new task and returns the persisted record. */
export async function createTask(task: {
  title: string;
  description?: string;
  completed?: boolean;
  priority?: number | null;
  due_date?: string;
  due_time?: string;
  tags: { name: string; color?: string }[];
  category?: string | null;
  created_date: string;
  completed_date?: string | null;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/create-task`, {
    method: "POST",
    headers,
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

/** Deletes a task by ID. Throws on any non-2xx response. */
export async function onDelete(id: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/del-task/${id}`, {
    method: "DELETE",
    headers,
  });
  await assertOk(res, "onDelete");
}

/** Replaces the full task record (all fields) and returns the updated task. */
export async function updateWholeTask(id: number, task: {
  title: string;
  description?: string;
  completed?: boolean;
  priority?: number | null;
  due_date?: string | null;
  due_time?: string | null;
  tags: { id: number; name: string; color: string }[];
  category?: string | null;
  created_date?: string | null;
  completed_date?: string | null;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/update-task/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(task),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(JSON.stringify(errorData, null, 2));
  }
  return res.json();
}

/** Bulk-saves an array of tasks (used by the AI task-plan flow). */
export async function saveTasksToDBAPI(tasks: Task[]) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/save-tasks-list`, {
    method: "POST",
    headers,
    body: JSON.stringify(tasks),
  });
  if (!res.ok) throw new Error("Failed to save tasks list");
  return res.json();
}

// ── Tags ──────────────────────────────────────────────────────────────────────

/** Fetches all tags belonging to the authenticated user. */
export async function fetchTags() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/get-tags`, { headers });
  await assertOk(res, "fetchTags");
  return res.json();
}

/** Creates a new tag and returns the persisted record. */
export async function createTag(tag: { name: string; color?: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/create-tags`, {
    method: "POST",
    headers,
    body: JSON.stringify(tag),
  });
  if (!res.ok) throw new Error("Failed to create tag");
  return res.json();
}

/** Updates a tag's name and/or color. Returns the updated record. */
export async function updateTag(id: number, tag: { name: string; color: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/update-tag/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(tag),
  });
  if (!res.ok) throw new Error("Failed to update tag");
  return res.json();
}

/** Deletes a tag by ID. Throws on any non-2xx response. */
export async function onDeleteTag(id: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/del-tag/${id}`, {
    method: "DELETE",
    headers,
  });
  await assertOk(res, "onDeleteTag");
}

// ── Notes ─────────────────────────────────────────────────────────────────────

/** Fetches all notes belonging to the authenticated user. */
export async function fetchNotes(): Promise<Note[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/get-notes`, { headers });
  await assertOk(res, "fetchNotes");
  return res.json();
}

/** Creates a new note and returns the persisted record. */
export async function createNote(note: {
  title?: string;
  content?: string;
  tags?: { id: number; name: string; color?: string }[];
}): Promise<Note> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/create-note`, {
    method: "POST",
    headers,
    body: JSON.stringify(note),
  });
  await assertOk(res, "createNote");
  return res.json();
}

/** Partially updates a note's title, content, and/or tags. Returns the updated record. */
export async function updateNote(
  id: number,
  changes: {
    title?: string;
    content?: string;
    tags?: { id: number; name: string; color?: string }[];
  },
): Promise<Note> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/update-note/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(changes),
  });
  await assertOk(res, "updateNote");
  return res.json();
}

/** Deletes a note by ID and returns the deleted record. */
export async function deleteNote(id: number): Promise<Note> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/del-note/${id}`, {
    method: "DELETE",
    headers,
  });
  await assertOk(res, "deleteNote");
  return res.json();
}

// ── Account management ────────────────────────────────────────────────────────

/**
 * Updates the authenticated user's password via the backend (which enforces
 * that the account is an email/password account — not Google/OAuth).
 * Throws if the server returns 403 (OAuth account) or any other error.
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/update-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ new_password: newPassword }),
  });
  await assertOk(res, "updatePassword");
}

/**
 * Permanently deletes all user data and the Supabase auth record.
 * The caller must sign the user out immediately after this resolves.
 */
export async function deleteAccount(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/delete-account`, {
    method: "DELETE",
    headers,
  });
  await assertOk(res, "deleteAccount");
}

// ── Calendar Settings (BigPictureCalendar) ────────────────────────────────────

export async function fetchCalendarSettings(): Promise<CalendarSettings | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/get-calendar-settings`, { headers });
  if (res.status === 404) return null;
  await assertOk(res, "fetchCalendarSettings");
  return res.json();
}

export async function updateCalendarSettings(
  changes: Partial<Omit<CalendarSettings, "id">>,
): Promise<CalendarSettings> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/update-calendar-settings`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(changes),
  });
  await assertOk(res, "updateCalendarSettings");
  return res.json();
}

// ── Availability Preferences ──────────────────────────────────────────────────

export interface AvailabilityPreference {
  id: number;
  user_id: string;
  day_of_week: number;  // 0 = Sun … 6 = Sat  (JS Date.getDay())
  start_time: string;   // "HH:MM" UTC
  end_time: string;     // "HH:MM" UTC
  label: string | null;
}

/** Fetch the user's recurring blackout windows. */
export async function fetchAvailabilityPreferences(): Promise<AvailabilityPreference[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/availability-preferences`, { headers });
  await assertOk(res, "fetchAvailabilityPreferences");
  return res.json();
}

/** Create a new recurring blackout window. */
export async function createAvailabilityPreference(pref: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  label?: string | null;
}): Promise<AvailabilityPreference> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/availability-preferences`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pref),
  });
  await assertOk(res, "createAvailabilityPreference");
  return res.json();
}

/** Delete a blackout window by ID. */
export async function deleteAvailabilityPreference(id: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/availability-preferences/${id}`, {
    method: 'DELETE',
    headers,
  });
  await assertOk(res, "deleteAvailabilityPreference");
}

// ── Work Blocks ───────────────────────────────────────────────────────────────

/** Fetches all non-dismissed work blocks for the authenticated user. */
export async function fetchWorkBlocks(): Promise<WorkBlock[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/work-blocks`, { headers });
  await assertOk(res, "fetchWorkBlocks");
  return res.json();
}

/** Accept or dismiss an AI-suggested work block. */
export async function updateWorkBlockStatus(
  id: number,
  status: 'confirmed' | 'dismissed',
): Promise<WorkBlock> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/work-blocks/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  await assertOk(res, "updateWorkBlockStatus");
  return res.json();
}

/** Move a confirmed work block to a new time via drag-and-drop. */
export async function rescheduleWorkBlock(
  id: number,
  startTime: string,
  endTime: string,
): Promise<WorkBlock> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/work-blocks/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ start_time: startTime, end_time: endTime }),
  });
  await assertOk(res, "rescheduleWorkBlock");
  return res.json();
}

/** Hard-delete a work block (e.g. "Remove from Calendar" on a confirmed block). */
export async function deleteWorkBlock(id: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/work-blocks/${id}`, {
    method: 'DELETE',
    headers,
  });
  await assertOk(res, "deleteWorkBlock");
}

// ── Habits ────────────────────────────────────────────────────────────────────

export interface Habit {
  id: number;
  title: string;
  user_id?: string | null;
  current_streak: number;
  max_streak: number;
  logged_today: boolean;
  tags: { id: number; name: string; color?: string | null }[];
}

/** Fetches all habits for the authenticated user, including today's completion state. */
export async function fetchHabits(): Promise<Habit[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/get-habits`, { headers });
  await assertOk(res, "fetchHabits");
  return res.json();
}

/** Creates a new habit and returns the persisted record. */
export async function createHabit(habit: {
  title: string;
  tags?: { id: number; name: string; color?: string | null }[];
}): Promise<Habit> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/create-habit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(habit),
  });
  await assertOk(res, "createHabit");
  return res.json();
}

/** Updates a habit's title and tags. Returns the updated record. */
export async function updateHabit(
  id: number,
  habit: {
    title: string;
    tags?: { id: number; name: string; color?: string | null }[];
  },
): Promise<Habit> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/update-habit/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(habit),
  });
  await assertOk(res, "updateHabit");
  return res.json();
}

/** Deletes a habit (and all its logs via CASCADE). */
export async function deleteHabit(id: number): Promise<Habit> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/del-habit/${id}`, {
    method: 'DELETE',
    headers,
  });
  await assertOk(res, "deleteHabit");
  return res.json();
}

export interface HabitHistoryEntry {
  date: string;   // YYYY-MM-DD
  logged: boolean;
}

/** Fetches logged/not-logged status for the past 30 days for a habit. */
export async function fetchHabitHistory(habitId: number): Promise<HabitHistoryEntry[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/habit-history/${habitId}`, { headers });
  await assertOk(res, "fetchHabitHistory");
  return res.json();
}

/**
 * Toggles completion for a specific past date (or today).
 * Recalculates current_streak and max_streak from full history.
 * Returns the updated habit.
 */
export async function toggleHabitDate(habitId: number, date: string): Promise<Habit> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/toggle-habit-date/${habitId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ date }),
  });
  await assertOk(res, "toggleHabitDate");
  return res.json();
}

/**
 * Toggles today's completion for a habit.
 * - If not logged today: inserts a log, increments current_streak (and max_streak if needed).
 * - If already logged today: deletes the log, decrements current_streak.
 * Returns the updated habit with the new streak values and logged_today state.
 */
export async function toggleHabit(id: number): Promise<Habit> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/toggle-habit/${id}`, {
    method: 'PATCH',
    headers,
  });
  await assertOk(res, "toggleHabit");
  return res.json();
}

/**
 * Checks all habits for the user and resets current_streak to 0 for any
 * habit whose last log entry is older than yesterday.
 * Call this once on app load (e.g. in a useEffect on mount) to keep streaks accurate.
 */
export async function verifyHabitStreaks(): Promise<{ reset_count: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/verify-streaks`, {
    method: 'POST',
    headers,
  });
  await assertOk(res, "verifyHabitStreaks");
  return res.json();
}

