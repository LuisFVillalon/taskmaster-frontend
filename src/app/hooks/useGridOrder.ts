'use client';

import { useEffect, useState } from 'react';

/**
 * Persists a reorderable list of item ids to localStorage (instant local
 * cache, mirrors DoodleCanvas's persistence model) and, once available, to
 * the backend profile via `onRemoteSave`. Starts from `defaultOrder` on
 * every render (server and first client paint) so hydration always matches,
 * then swaps in the saved order (if any) right after mount.
 *
 * `remoteOrder` is the backend-authoritative value (e.g. `profile.layoutOrder`
 * from useProfile) — once it resolves to a valid order it overrides whatever
 * localStorage held, the same "backend wins once loaded" rule useProfile
 * applies to avatar/theme/etc. A null/absent remoteOrder just means "not
 * saved there yet", so it never overwrites the local value.
 */
export function useGridOrder(
  storageKey: string,
  defaultOrder: string[],
  remoteOrder?: string[] | null,
  onRemoteSave?: (order: string[]) => void,
) {
  const [order, setOrder] = useState<string[]>(defaultOrder);

  const isValidOrder = (candidate: unknown): candidate is string[] =>
    Array.isArray(candidate) &&
    candidate.length === defaultOrder.length &&
    defaultOrder.every(id => candidate.includes(id));

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (isValidOrder(parsed)) setOrder(parsed);
    } catch {
      // malformed or inaccessible storage — fall back to defaultOrder
    }
    // Only re-check when the storage key itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!isValidOrder(remoteOrder)) return;
    setOrder(remoteOrder);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(remoteOrder));
    } catch {
      // e.g. private browsing storage quota — ordering just won't persist locally
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteOrder]);

  const updateOrder = (next: string[]) => {
    setOrder(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // e.g. private browsing storage quota — ordering just won't persist
    }
    onRemoteSave?.(next);
  };

  return [order, updateOrder] as const;
}
