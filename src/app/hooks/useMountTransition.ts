'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a conditionally-rendered subtree mounted for `duration` ms after
 * `show` flips to false, so it can play a CSS exit animation instead of
 * vanishing instantly (as a plain `{show && <X/>}` does). Pair with the
 * `animate-fade-in`/`animate-fade-out` utilities in globals.css, or any
 * animation classes of matching duration.
 */
export function useMountTransition(show: boolean, duration = 200) {
  const [shouldRender, setShouldRender] = useState(show);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (show) {
      setShouldRender(true);
    } else if (shouldRender) {
      timeoutRef.current = setTimeout(() => setShouldRender(false), duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, duration]);

  return shouldRender;
}
