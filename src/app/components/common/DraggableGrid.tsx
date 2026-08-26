'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Move } from 'lucide-react';

export interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
}

interface DraggableGridProps {
  /** Item ids in current display order. */
  order: string[];
  /**
   * Fired when the user releases a drag over a different id. The consumer
   * owns what dropping `draggedId` onto `targetId` actually means (e.g. a
   * same-size swap vs. a whole-slot swap) and is responsible for computing
   * and applying the resulting `order`.
   */
  onDrop: (draggedId: string, targetId: string) => void;
  /**
   * Renders one cell's content. Receives `dragHandleProps` so the cell's own
   * grip element (not the cell as a whole) is what starts a drag.
   */
  items: (id: string, index: number, dragHandleProps: DragHandleProps) => React.ReactNode;
  className?: string;
  /** Optional per-item class (e.g. a column/row span) keyed by id and display index. */
  itemClassName?: (id: string, index: number) => string;
  /** Display title per id, used by the drag-ghost follower's label. */
  titles?: Record<string, string>;
  /**
   * Classifies each id into a size/kind (e.g. 'M' for a big tile, 'S' for a
   * small one). Purely advisory here — every id is always a valid drop
   * target — but it drives the ghost label ("Swap with X" vs a whole-slot
   * description) and lets a same-kind vs. cross-kind drop read differently.
   */
  groupOf?: (id: string) => string;
  /**
   * For an id that shares its slot with exactly one other id (e.g. two small
   * tiles paired into one big tile's slot), returns that other id. Used to
   * highlight the full set of tiles that will move together on a cross-kind
   * (whole-slot) swap — e.g. dragging a big tile onto one of a small pair
   * swaps the *entire* pair into the big's old slot, so both small tiles
   * light up as the drop target, not just the one under the pointer.
   */
  siblingOf?: (id: string) => string | undefined;
}

/**
 * Wraps a set of grid cells with grip-initiated drag-to-insert reordering:
 * pointerdown on a cell's own grip starts the drag immediately (no hold
 * timer — the grip is a dedicated small target, so there's no risk of
 * hijacking clicks/scrolls the way a whole-card drag surface had), a fixed
 * ghost follows the pointer, the nearest cell becomes the insertion point,
 * and releasing reports the drop via `onDrop` for the consumer to apply.
 * Tiles that end up shifting slots as a result slide smoothly into place
 * (FLIP) rather than jumping.
 */
const DraggableGrid: React.FC<DraggableGridProps> = ({ order, onDrop, items, className, itemClassName, titles, groupOf, siblingOf }) => {
  const itemRefs = useRef<Record<string, HTMLDivElement>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const draggingIdRef = useRef<string | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const orderRef = useRef(order);
  // Rects captured immediately before a drop reorders `order`, so the
  // post-reorder layout effect can FLIP-animate tiles from where they used
  // to be to their new slot instead of snapping.
  const prevRectsRef = useRef<Record<string, DOMRect> | null>(null);

  useEffect(() => { orderRef.current = order; }, [order]);

  const resetDragState = useCallback(() => {
    setDraggingId(null);
    setDropIndex(null);
    setDragPos(null);
    draggingIdRef.current = null;
    dropIndexRef.current = null;
    activePointerId.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current || !draggingIdRef.current) return;
    e.preventDefault();
    setDragPos({ x: e.clientX, y: e.clientY });

    const dragged = draggingIdRef.current;
    let bestId: string | null = null;
    let bestDist = Infinity;
    // Iterate the known current ids rather than every key ever stored on
    // itemRefs, so a stale entry left behind by a since-removed id (if ref
    // cleanup ever lags a reorder) can never be picked as the drop target.
    // Every other tile is a legal drop target — a big tile can land on a
    // small pair (whole-slot swap) just as readily as on the other big.
    for (const id of orderRef.current) {
      if (id === dragged) continue;
      const el = itemRefs.current[id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < bestDist) { bestDist = dist; bestId = id; }
    }
    const idx = bestId ? orderRef.current.indexOf(bestId) : null;
    dropIndexRef.current = idx;
    setDropIndex(idx);
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;

    const dragged = draggingIdRef.current;
    const toIdx = dropIndexRef.current;
    if (dragged && toIdx != null) {
      const targetId = orderRef.current[toIdx];
      if (targetId && targetId !== dragged) {
        const rects: Record<string, DOMRect> = {};
        for (const id of orderRef.current) {
          const el = itemRefs.current[id];
          if (el) rects[id] = el.getBoundingClientRect();
        }
        prevRectsRef.current = rects;
        onDrop(dragged, targetId);
      }
    }
    resetDragState();
  }, [onDrop, resetDragState]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && draggingIdRef.current) resetDragState();
  }, [resetDragState]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePointerMove, handlePointerUp, handleKeyDown]);

  // FLIP: when a drop just reordered `order`, tiles whose slot moved get an
  // inline transform back to their pre-drop position (applied synchronously,
  // pre-paint) and then transition it away next frame, so they visibly slide
  // into their new spot instead of teleporting.
  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current;
    prevRectsRef.current = null;
    if (!prevRects) return;

    const animated: HTMLDivElement[] = [];
    for (const id of order) {
      const el = itemRefs.current[id];
      const prev = prevRects[id];
      if (!el || !prev) continue;
      const next = el.getBoundingClientRect();
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      animated.push(el);
    }
    if (animated.length === 0) return;
    // Force layout so the instant transform above is committed before the
    // transitioned one below, otherwise the browser may coalesce both into
    // a single frame and skip the animation entirely.
    animated[0].getBoundingClientRect();
    const raf = requestAnimationFrame(() => {
      for (const el of animated) {
        el.style.transition = 'transform 260ms cubic-bezier(0.2, 0, 0, 1)';
        el.style.transform = '';
        const onDone = () => { el.style.transition = ''; el.removeEventListener('transitionend', onDone); };
        el.addEventListener('transitionend', onDone);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [order]);

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    activePointerId.current = e.pointerId;
    draggingIdRef.current = id;
    dropIndexRef.current = orderRef.current.indexOf(id);
    setDraggingId(id);
    setDropIndex(dropIndexRef.current);
    setDragPos({ x: e.clientX, y: e.clientY });
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
  };

  const targetId = dropIndex != null ? order[dropIndex] : null;
  const isWholeSlotSwap = !!(draggingId && targetId && groupOf && groupOf(draggingId) !== groupOf(targetId));
  // The full set of tiles involved in the pending drop: the dragged tile and
  // the hovered target always; on a cross-kind (whole-slot) swap, also each
  // side's sibling, since the whole pair moves together, not just the one
  // tile under the pointer.
  const targetSibling = isWholeSlotSwap ? siblingOf?.(targetId!) : undefined;
  const draggedSibling = isWholeSlotSwap ? siblingOf?.(draggingId!) : undefined;

  const ghostLabel = (() => {
    if (!draggingId) return null;
    if (!targetId || targetId === draggingId) return { icon: 'move' as const, text: titles?.[draggingId] ?? draggingId };
    const targetNames = [targetId, targetSibling].filter((x): x is string => !!x).map(id => titles?.[id] ?? id);
    return { icon: 'swap' as const, text: targetNames.join(' & ') };
  })();

  return (
    <div className={className}>
      {/* Collecting a list of DOM nodes via callback ref (below) is React's
          own documented pattern for this; the callback only ever runs at
          commit time, never during render, despite how react-hooks/refs
          reads it. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {order.map((id, index) => {
        const isDragging = draggingId === id;
        const isPrimaryTarget = draggingId !== null && !isDragging && targetId === id;
        const isCoMoving = draggingId !== null && !isDragging && !isPrimaryTarget && (id === targetSibling || id === draggedSibling);
        return (
          <div
            key={id}
            ref={el => { if (el) itemRefs.current[id] = el; }}
            className={`relative rounded-xl ${itemClassName?.(id, index) ?? ''}`}
            style={{
              outline: isPrimaryTarget ? '2px solid var(--tm-accent)' : isCoMoving ? '2px dashed var(--tm-accent)' : undefined,
              outlineOffset: isPrimaryTarget || isCoMoving ? '3px' : undefined,
              boxShadow: isPrimaryTarget ? '0 8px 24px -8px var(--tm-accent)' : undefined,
              backgroundColor: isCoMoving ? 'var(--tm-accent-subtle)' : undefined,
              opacity: isDragging ? 0.45 : 1,
              transition: isDragging ? 'none' : 'opacity 150ms ease, outline-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
            }}
          >
            {items(id, index, { onPointerDown: startDrag(id) })}
          </div>
        );
      })}
      {draggingId && dragPos && ghostLabel && (
        <div
          className="fixed pointer-events-none z-[70] flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
          style={{
            left: dragPos.x + 12,
            top: dragPos.y - 12,
            background: 'var(--tm-surface)',
            borderColor: 'var(--tm-accent)',
            color: 'var(--tm-accent)',
            boxShadow: '0px 12px 32px rgba(0,0,0,0.16)',
          }}
        >
          {ghostLabel.icon === 'swap' ? (
            <>
              <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
              Swap with {ghostLabel.text}
            </>
          ) : (
            <>
              <Move className="w-3.5 h-3.5 flex-shrink-0" />
              Moving {ghostLabel.text}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DraggableGrid;
