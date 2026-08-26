import React from 'react';
import { Maximize2, GripVertical } from 'lucide-react';
import type { DragHandleProps } from '@/app/components/common/DraggableGrid';

export type TileSize = 'S' | 'M' | 'W' | 'L';

interface TileToolsProps {
  onExpand: () => void;
  dragHandleProps: DragHandleProps;
}

// Hidden until the tile is hovered/focused, always visible on touch (no
// hover to reveal it there) — shared by all six dashboard tiles' tool
// clusters via CardShell's `compact` root (`group` class).
const REVEAL = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200';

/**
 * The one shared implementation of a compact dashboard tile's tool cluster —
 * expand button (opens the full-detail overlay) and drag grip (pointerdown
 * starts a grip-initiated reorder via DraggableGrid's dragHandleProps).
 * Identical across all six tiles per the redesign spec, so it lives here
 * once instead of being reimplemented per widget.
 */
const TileTools: React.FC<TileToolsProps> = ({ onExpand, dragHandleProps }) => (
  <>
    <button
      type="button"
      onClick={onExpand}
      title="Expand"
      aria-label="Expand tile"
      className={`${REVEAL} w-[22px] h-[22px] rounded-md border flex items-center justify-center`}
      style={{ borderColor: 'var(--tm-border)', backgroundColor: 'var(--tm-surface)', color: 'var(--tm-text-secondary)' }}
    >
      <Maximize2 className="w-3 h-3" />
    </button>
    <span
      onPointerDown={dragHandleProps.onPointerDown}
      title="Drag to reposition"
      role="button"
      tabIndex={0}
      aria-label="Drag to reposition"
      className={`${REVEAL} w-[22px] h-[22px] rounded-md flex items-center justify-center cursor-grab`}
      style={{ color: 'var(--tm-text-muted)' }}
    >
      <GripVertical className="w-3.5 h-3.5" />
    </span>
  </>
);

export default TileTools;
