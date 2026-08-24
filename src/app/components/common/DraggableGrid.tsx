'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// How long a pointer must stay down (without moving) before a hold turns
// into a drag. Comfortably above a normal click/tap so nothing inside the
// cards (buttons, checkboxes, scroll gestures) gets hijacked by accident.
const HOLD_MS = 350;
const CANCEL_MOVE_PX = 8;

const isInteractiveTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof Element)) return false;
  return !!el.closest('button, a, input, textarea, select, [contenteditable], [role="button"], [data-no-drag]');
};

interface DraggableGridProps {
  /** Item ids in current display order. */
  order: string[];
  onReorder: (next: string[]) => void;
  /** Content for each id, keyed the same way as `order`. */
  items: Record<string, React.ReactNode>;
  className?: string;
  /** Optional per-item class (e.g. a column span) keyed by id and display index. */
  itemClassName?: (id: string, index: number) => string;
}

/**
 * Wraps a set of grid cells with hold-to-drag reordering: press and hold a
 * cell, drag it over another, and release to swap their positions. No
 * external DnD library — just pointer events plus a hold timer, since the
 * grid only ever holds a handful of items.
 */
const DraggableGrid: React.FC<DraggableGridProps> = ({ order, onReorder, items, className, itemClassName }) => {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const holdTimer = useRef<number | null>(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const movedWhileDragging = useRef(false);
  const orderRef = useRef(order);
  const justDraggedRef = useRef<string | null>(null);

  useEffect(() => { orderRef.current = order; }, [order]);

  const clearHoldTimer = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const resetDragState = useCallback(() => {
    setDraggingId(null);
    setHoverId(null);
    setDragOffset({ x: 0, y: 0 });
    draggingIdRef.current = null;
    hoverIdRef.current = null;
    activePointerId.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    if (!draggingIdRef.current) {
      // Still waiting out the hold — a real move means the user is
      // scrolling or clicking, not trying to drag. Bail out.
      if (Math.hypot(dx, dy) > CANCEL_MOVE_PX) clearHoldTimer();
      return;
    }

    movedWhileDragging.current = true;
    e.preventDefault();
    setDragOffset({ x: dx, y: dy });

    let bestId: string | null = null;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, id) => {
      if (id === draggingIdRef.current) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < bestDist) { bestDist = dist; bestId = id; }
    });
    hoverIdRef.current = bestId;
    setHoverId(bestId);
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    clearHoldTimer();

    const dragged = draggingIdRef.current;
    const target = hoverIdRef.current;
    if (dragged && target && target !== dragged && movedWhileDragging.current) {
      const curOrder = orderRef.current;
      const fromIdx = curOrder.indexOf(dragged);
      const toIdx = curOrder.indexOf(target);
      if (fromIdx !== -1 && toIdx !== -1) {
        const next = [...curOrder];
        [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
        onReorder(next);
      }
      // Swallow the click this pointerup is about to generate so whatever
      // the card landed on doesn't also fire.
      justDraggedRef.current = dragged;
    }
    movedWhileDragging.current = false;
    resetDragState();
  }, [onReorder, resetDragState]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => () => clearHoldTimer(), []);

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;

    activePointerId.current = e.pointerId;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    movedWhileDragging.current = false;
    clearHoldTimer();

    holdTimer.current = window.setTimeout(() => {
      draggingIdRef.current = id;
      setDraggingId(id);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
    }, HOLD_MS);
  };

  const handleClickCapture = (id: string) => (e: React.MouseEvent) => {
    if (justDraggedRef.current === id) {
      e.preventDefault();
      e.stopPropagation();
      justDraggedRef.current = null;
    }
  };

  return (
    <div className={className}>
      {order.map((id, index) => {
        const isDragging = draggingId === id;
        const isHoverTarget = draggingId !== null && hoverId === id;
        return (
          <div
            key={id}
            ref={el => { if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id); }}
            onPointerDown={handlePointerDown(id)}
            onClickCapture={handleClickCapture(id)}
            className={`relative ${itemClassName?.(id, index) ?? ''}`}
            style={{
              cursor: draggingId ? (isDragging ? 'grabbing' : 'default') : 'grab',
              transform: isDragging ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.03)` : undefined,
              transition: isDragging ? 'none' : 'transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease',
              zIndex: isDragging ? 30 : undefined,
              boxShadow: isDragging ? '0 16px 36px -8px rgba(0,0,0,0.35)' : undefined,
              outline: isHoverTarget ? '2px dashed var(--tm-accent)' : undefined,
              outlineOffset: isHoverTarget ? '2px' : undefined,
              opacity: draggingId && !isDragging && !isHoverTarget ? 0.85 : 1,
            }}
          >
            {items[id]}
          </div>
        );
      })}
    </div>
  );
};

export default DraggableGrid;
