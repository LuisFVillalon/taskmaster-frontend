'use client';

import { useEffect, useState } from 'react';

/**
 * Persists a reorderable list of item ids to localStorage. Starts from
 * `defaultOrder` on every render (server and first client paint) so
 * hydration always matches, then swaps in the saved order (if any) right
 * after mount.
 */
export function useGridOrder(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(defaultOrder);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as string[];
      const isValid =
        Array.isArray(parsed) &&
        parsed.length === defaultOrder.length &&
        defaultOrder.every(id => parsed.includes(id));
      if (isValid) setOrder(parsed);
    } catch {
      // malformed or inaccessible storage — fall back to defaultOrder
    }
    // Only re-check when the storage key itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const updateOrder = (next: string[]) => {
    setOrder(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // e.g. private browsing storage quota — ordering just won't persist
    }
  };

  return [order, updateOrder] as const;
}
