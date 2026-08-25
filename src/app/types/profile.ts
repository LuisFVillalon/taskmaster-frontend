/**
 * The authenticated user's profile record, backed by the `/get-profile` /
 * `/save-profile` endpoints. `name` is required; every other field is
 * optional and nullable — a `null` means the user hasn't saved that field
 * from this app yet, not that the column is unsupported.
 */
export interface Profile {
  user_id: string;
  name: string;
  created_at: string;
  shutoff_time: string | null;
  /** Selected avatar key from lib/avatar.ts's AVATAR_OPTIONS. */
  avatar?: string | null;
  /** Selected accent color hex from lib/theme.ts's THEME_ACCENT_COLORS. */
  theme_accent?: string | null;
  /** Selected notebook page style key from lib/pageStyle.ts's PAGE_STYLES. */
  page_style?: string | null;
  /** "HH:MM" — start of the user's day, used by the Daily Window timer. */
  day_start_time?: string | null;
  /** Day-of-week indices (0=Sun..6=Sat, JS Date#getDay()) treated as rest days. */
  rest_days?: number[] | null;
  /** Dashboard card ordering — see hooks/useGridOrder.ts and ProfileFields.layoutOrder in useProfile.ts. */
  layout_order?: string[] | null;
}
