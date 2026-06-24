import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { fetchProfile } from '@/app/lib/backend-api';

export const useProfileName = (user: User | null): string | null => {
  const [profileName, setProfileName] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tm_profile_name');
  });

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then(p => {
        if (p) {
          setProfileName(p.name);
          localStorage.setItem('tm_profile_name', p.name);
        } else if (!profileName) {
          setProfileName(user.email?.split('@')[0] ?? null);
        }
      })
      .catch(() => {
        if (!profileName) setProfileName(user.email?.split('@')[0] ?? null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return profileName;
};
