import { useRef, useCallback } from 'react';

interface UseResizableSplitOptions {
  /** Lower clamp in px (omit to skip clamping). */
  min?: number;
  /** Upper clamp in px (omit to skip clamping). */
  max?: number;
  /** 'left' measures from container left edge; 'right' measures from container right edge. */
  anchor?: 'left' | 'right';
  onResize: (px: number) => void;
  onResizingChange?: (isResizing: boolean) => void;
}

/**
 * Returns a mousedown handler that drives a draggable panel-resize interaction.
 * Attach the returned handler to the drag-handle element's onMouseDown prop.
 */
export function useResizableSplit(
  containerRef: React.RefObject<HTMLElement | null>,
  { min, max, anchor = 'left', onResize, onResizingChange }: UseResizableSplitOptions,
) {
  const isDragging = useRef(false);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      onResizingChange?.(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let raw = anchor === 'left' ? ev.clientX - rect.left : rect.right - ev.clientX;
        if (min !== undefined) raw = Math.max(min, raw);
        if (max !== undefined) raw = Math.min(max, raw);
        onResize(raw);
      };

      const onUp = () => {
        isDragging.current = false;
        onResizingChange?.(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [containerRef, min, max, anchor, onResize, onResizingChange],
  );

  return onMouseDown;
}
