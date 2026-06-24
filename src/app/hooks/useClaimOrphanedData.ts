import { useRef, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { claimOrphanedData } from '@/app/lib/backend-api';

export const useClaimOrphanedData = (user: User | null): void => {
  const claimRan = useRef(false);

  useEffect(() => {
    if (!user || claimRan.current) return;
    const flagKey = `taskmaster_claimed_${user.id}`;
    if (localStorage.getItem(flagKey)) return;
    claimRan.current = true;

    claimOrphanedData().then(claimed => {
      if (claimed) {
        localStorage.setItem(flagKey, '1');
        const total = claimed.tasks + claimed.notes + claimed.tags + claimed.calendar_settings;
        if (total > 0) {
          console.info(`[claim-data] Linked ${claimed.tasks} tasks, ${claimed.notes} notes to account.`);
          window.location.reload();
        } else {
          localStorage.setItem(flagKey, '1');
        }
      }
    });
  }, [user]);
};
