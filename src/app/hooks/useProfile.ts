'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { fetchProfile, saveProfile as saveProfileApi } from '@/app/lib/backend-api';
import { DEFAULT_ACCENT, getStoredThemeColor, setStoredThemeColor, resetThemeColor } from '@/app/lib/theme';
import { DEFAULT_PAGE_STYLE, getStoredPageStyle, setStoredPageStyle, resetPageStyle } from '@/app/lib/pageStyle';
import { getStoredProfileAvatar, setStoredProfileAvatar } from '@/app/lib/avatar';
import { DEFAULT_DAY_START, DEFAULT_DAY_END, loadStoredRestDays } from '@/app/lib/restDays';

export interface ProfileFields {
  name: string;
  avatar: string | null;
  themeAccent: string;
  pageStyle: string;
  dayStartTime: string;
  shutoffTime: string;
  restDays: number[];
}

const readLocalDefaults = (): ProfileFields => ({
  name: (typeof window !== 'undefined' ? localStorage.getItem('tm_profile_name') : null) ?? 'G.O.A.T.',
  avatar: getStoredProfileAvatar(),
  themeAccent: getStoredThemeColor() ?? DEFAULT_ACCENT,
  pageStyle: getStoredPageStyle() ?? DEFAULT_PAGE_STYLE,
  dayStartTime: (typeof window !== 'undefined' ? localStorage.getItem('tm_day_start_time') : null) ?? DEFAULT_DAY_START,
  shutoffTime: (typeof window !== 'undefined' ? localStorage.getItem('tm_call_it_a_day') : null) ?? DEFAULT_DAY_END,
  restDays: loadStoredRestDays(),
});

/**
 * Single source of truth for the user's profile — name, avatar, appearance,
 * and daily-schedule preferences. `name`/`shutoffTime` are backend-authoritative
 * once `fetchProfile()` resolves (falling back to the localStorage cache /
 * defaults above until then, or forever if the request fails); every other
 * field is localStorage-only today — see the `Profile` interface in
 * types/profile.ts for the fields the backend contract still needs to grow
 * to cover, and `saveProfile()`'s call below for exactly what's already sent.
 *
 * Call this once (in TaskManager) and thread `profile`/`saveProfile` down to
 * whatever needs them (Settings, TimersCard, ...) rather than calling it from
 * every consumer — each call independently re-fetches from the backend.
 */
export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<ProfileFields>(readLocalDefaults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const p = await fetchProfile();
        if (!p) return;
        setProfile(prev => ({ ...prev, name: p.name, shutoffTime: p.shutoff_time ?? prev.shutoffTime }));
        localStorage.setItem('tm_profile_name', p.name);
        if (p.shutoff_time) localStorage.setItem('tm_call_it_a_day', p.shutoff_time);
      } catch {
        // keep localStorage/default fallback
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const saveProfile = useCallback(async (next: ProfileFields): Promise<{ ok: boolean; error?: string }> => {
    try {
      // TODO(backend): saveProfileApi's request body only carries name/
      // shutoff_time today, matching what /save-profile currently accepts.
      // Once it also accepts avatar/theme_accent/page_style/day_start_time/
      // rest_days (see Profile in types/profile.ts), extend this call to
      // send `next` in full instead of persisting the rest to localStorage
      // only — a strict backend schema could otherwise reject the whole
      // request if sent early.
      await saveProfileApi({ name: next.name, shutoff_time: next.shutoffTime });

      localStorage.setItem('tm_profile_name', next.name);
      localStorage.setItem('tm_day_start_time', next.dayStartTime);
      localStorage.setItem('tm_call_it_a_day', next.shutoffTime);
      localStorage.setItem('tm_rest_days', JSON.stringify(next.restDays));
      setStoredProfileAvatar(next.avatar);
      if (next.themeAccent === DEFAULT_ACCENT) resetThemeColor();
      else setStoredThemeColor(next.themeAccent);
      if (next.pageStyle === DEFAULT_PAGE_STYLE) resetPageStyle();
      else setStoredPageStyle(next.pageStyle);

      setProfile(next);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to save profile.' };
    }
  }, []);

  return { profile, loading, saveProfile };
}
