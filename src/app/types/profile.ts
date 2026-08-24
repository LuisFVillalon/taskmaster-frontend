/**
 * The authenticated user's profile record. `name` and `shutoff_time` are
 * backed by the `/get-profile` / `/save-profile` endpoints today. The
 * remaining fields are optional because the backend doesn't persist them
 * yet — see the request-body contract documented on `saveProfile()` in
 * lib/backend-api.ts for exactly what the backend needs to accept next.
 */
export interface Profile {
  user_id: string;
  name: string;
  created_at: string;
  shutoff_time: string | null;
  /** Selected avatar key from lib/avatar.ts's AVATAR_OPTIONS. Not yet backend-persisted. */
  avatar?: string | null;
  /** Selected accent color hex from lib/theme.ts's THEME_ACCENT_COLORS. Not yet backend-persisted. */
  theme_accent?: string | null;
  /** Selected notebook page style key from lib/pageStyle.ts's PAGE_STYLES. Not yet backend-persisted. */
  page_style?: string | null;
  /** "HH:MM" — start of the user's day, used by the Daily Window timer. Not yet backend-persisted. */
  day_start_time?: string | null;
  /** Day-of-week indices (0=Sun..6=Sat, JS Date#getDay()) treated as rest days. Not yet backend-persisted. */
  rest_days?: number[] | null;
  /** Dashboard card ordering (see hooks/useGridOrder.ts). Not yet backend-persisted. */
  layout_order?: string[] | null;
}
