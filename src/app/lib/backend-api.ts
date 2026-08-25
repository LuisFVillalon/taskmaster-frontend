/*
 * Backend API client — all requests to the FastAPI backend (taskmaster-backend).
 *
 * Every request is authenticated via the Supabase JWT:
 *   Authorization: Bearer <access_token>
 *
 * The token is retrieved from the active Supabase session. If there is no
 * session the call throws so the caller can redirect to /login.
 */

import { Task } from "../types/task";
import { Note } from "../types/notes";
import { CalendarSettings } from "../types/calendar";
import { Habit, HabitHistoryEntry } from "../types/habit";
import { Profile } from "../types/profile";
import { Drawing } from "../types/drawing";
import { DailyDebriefReport } from "../types/debrief";
import { toLocalDateStr, toLocalTimeStr } from "../utils/dateUtils";
import { LearningResourcesResponse } from "../types/learningResources";
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${API_BASE_URL}/claim-data`, {
        method: 'POST',
        headers,
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body.claimed ?? null;
    } finally {
      clearTimeout(timeout);
    }
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
  parent_task_id?: number | null;
  estimated_time?: number | null;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/create-task`, {
    method: "POST",
    headers,
    body: JSON.stringify(task),
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      detail = body?.detail ?? JSON.stringify(body);
    } catch { /* body wasn't JSON */ }
    throw new Error(`Failed to create task: ${detail}`);
  }
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

// ── Habits ────────────────────────────────────────────────────────────────────

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

/** Fetches logged/not-logged status for the past `days` days (default 30) for a habit. */
export async function fetchHabitHistory(habitId: number, days: number = 30): Promise<HabitHistoryEntry[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/habit-history/${habitId}?days=${days}`, { headers });
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

// ── Profile ───────────────────────────────────────────────────────────────────

/** Fetches the authenticated user's profile. Returns null if none exists yet. */
export async function fetchProfile(): Promise<Profile | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/get-profile`, { headers });
  if (res.status === 404) return null;
  await assertOk(res, "fetchProfile");
  return res.json();
}

/**
 * Creates or updates the authenticated user's profile. Returns the saved record.
 * All fields besides `name` are optional and upserted individually (unset
 * fields on the request leave the stored value untouched — see
 * `upsert_profile` in the backend's `profile_crud.py`).
 */
export async function saveProfile(profile: {
  name: string;
  shutoff_time?: string | null;
  avatar?: string | null;
  theme_accent?: string | null;
  page_style?: string | null;
  day_start_time?: string | null;
  rest_days?: number[] | null;
  layout_order?: string[] | null;
  app_mode?: string | null;
  daily_brief_collapsed?: boolean | null;
  dashboard_view?: string | null;
  notes_view_mode?: string | null;
}): Promise<Profile> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/save-profile`, {
    method: 'POST',
    headers,
    body: JSON.stringify(profile),
  });
  await assertOk(res, "saveProfile");
  return res.json();
}

// ── Drawing (doodle mode) ───────────────────────────────────────────────────
// Shape mirrors fetchProfile/saveProfile (GET 404 → null for "no drawing
// saved yet", POST upserts, backend derives user_id from the JWT). See
// DoodleCanvas.tsx for the try-backend-then-fall-back-to-localStorage caller.

/** Fetches the authenticated user's saved doodle. Returns null if none exists yet. */
export async function fetchDrawing(): Promise<Drawing | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/get-drawing`, { headers });
  if (res.status === 404) return null;
  await assertOk(res, "fetchDrawing");
  return res.json();
}

/** Creates or overwrites the authenticated user's doodle. Returns the saved record. */
export async function saveDrawingRemote(imageDataUrl: string): Promise<Drawing> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/save-drawing`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image_data_url: imageDataUrl }),
  });
  await assertOk(res, "saveDrawingRemote");
  return res.json();
}

/** Deletes the authenticated user's saved doodle, if any. */
export async function deleteDrawingRemote(): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/delete-drawing`, {
    method: 'DELETE',
    headers,
  });
  await assertOk(res, "deleteDrawingRemote");
}

const AI_BASE_URL = process.env.NEXT_PUBLIC_TASKMASTER_AI_URL!;

// ── Learning Resources ────────────────────────────────────────────────────────

export async function fetchLearningResources(noteContent: string): Promise<LearningResourcesResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated — no active Supabase session.");
  const res = await fetch(`${AI_BASE_URL}/learning-resources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ note_content: noteContent }),
  });
  await assertOk(res, "fetchLearningResources");
  return res.json();
}

// ── Task Debrief ──────────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's daily debrief — overdue/due-today tasks,
 * habit status, workload capacity, and focus-next recommendations — computed
 * server-side from DB state (no AI call, unlike learning-resources above).
 *
 * Sends our own local date/time rather than letting the server infer "today"
 * from its own clock — the backend may run in a different timezone (e.g.
 * UTC), and using its date would roll "today" over before our local day
 * ends, silently reclassifying today's tasks as overdue.
 */
export async function fetchTaskDebrief(): Promise<DailyDebriefReport> {
  const headers = await getAuthHeaders();
  const now = new Date();
  const params = new URLSearchParams({
    local_date: toLocalDateStr(now),
    local_time: toLocalTimeStr(now),
  });
  const res = await fetch(`${API_BASE_URL}/daily-debrief?${params.toString()}`, { headers });
  await assertOk(res, "fetchTaskDebrief");
  return res.json();
}

