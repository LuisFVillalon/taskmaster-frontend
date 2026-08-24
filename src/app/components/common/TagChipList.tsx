'use client';

import React from 'react';

export interface TagChipListTag {
  id: number;
  name: string;
  color?: string | null;
}

/**
 * Visual size preset — kept as three distinct tokens (not collapsed to
 * one) because the three call sites this replaces genuinely render at
 * three different sizes; picking one would be a visual regression for
 * whichever two didn't already match it.
 */
type TagChipSize = 'sm' | 'xs' | '2xs';

const SIZE_CLASS: Record<TagChipSize, string> = {
  sm: 'px-2 py-1',
  xs: 'px-1.5 py-0.5',
  '2xs': 'px-1.5 py-0.5',
};

const SIZE_STYLE: Record<TagChipSize, React.CSSProperties> = {
  sm: { fontSize: '11px', fontWeight: 'bold' },
  xs: { fontSize: '10px', fontWeight: 'bold' },
  '2xs': { fontSize: '9px', fontWeight: 500 },
};

interface TagChipListProps {
  tags: TagChipListTag[];
  /** Default 'sm'. See TagChipSize above for what each maps to. */
  size?: TagChipSize;
  /** Caps the number of chips shown, folding the rest into a "+N" badge. Omit to show every tag. */
  maxVisible?: number;
  className?: string;
}

/**
 * A row of colored tag pills — the rendering shared by every "show this
 * item's tags" spot in the app (task rows, day-summary lists, note cards).
 * Callers that need to re-resolve a tag's *current* color from a live tags
 * list (rather than trusting a possibly-stale color already on the tag
 * reference) should do that resolution before passing tags in here; this
 * component only renders what it's given.
 */
const TagChipList: React.FC<TagChipListProps> = ({ tags, size = 'sm', maxVisible, className = '' }) => {
  if (!tags?.length) return null;

  const visible = maxVisible != null ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = tags.length - visible.length;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map(tag => (
        <span
          key={tag.id}
          className={`chip ${SIZE_CLASS[size]} text-white whitespace-nowrap`}
          style={{ backgroundColor: tag.color ?? 'var(--tm-accent)', ...SIZE_STYLE[size] }}
        >
          {tag.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          className={`chip ${SIZE_CLASS[size]} text-text-muted whitespace-nowrap`}
          style={{ backgroundColor: 'var(--tm-surface-raised)', ...SIZE_STYLE[size] }}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

export default TagChipList;
