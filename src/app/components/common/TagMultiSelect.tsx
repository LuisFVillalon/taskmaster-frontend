'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface TagMultiSelectTag {
  id: number;
  name: string;
  color: string;
}

interface TagMultiSelectProps<T extends TagMultiSelectTag> {
  tags: T[];
  isSelected: (tag: T) => boolean;
  onToggle: (tag: T) => void;
  /** Classes for the grid container — columns/gap/padding/rounding/max-height differ per call site. */
  gridClassName: string;
  gridStyle?: React.CSSProperties;
  /** Classes for each toggle button — padding/shape/text-size/hover-scale differ per call site. */
  buttonClassName: string;
  /** Background used when a tag is NOT selected — varies per call site (surface vs. surface-raised). */
  unselectedBg: string;
  /** Applies the selected/unselected scale-transform micro-interaction (paired with `hover:scale-100 active:scale-95` in buttonClassName). Some call sites don't animate at all. */
  scaleAnimation?: boolean;
  /** Id of the tag currently mid-toggle (async case) — disables every button and shows a spinner on the active one. Omit for sites with no async per-tag toggle. */
  togglingId?: number | null;
}

/**
 * The "grid of tag toggle buttons" shared by the habit-create form, the
 * habit-manage inline editor, and the note tag picker — each still owns its
 * own label/wrapper/disclosure chrome, but the actual tri-state (selected /
 * unselected / mid-toggle) button rendering was duplicated three times.
 */
function TagMultiSelect<T extends TagMultiSelectTag>({
  tags, isSelected, onToggle, gridClassName, gridStyle, buttonClassName, unselectedBg, scaleAnimation = false, togglingId,
}: TagMultiSelectProps<T>) {
  return (
    <div className={gridClassName} style={gridStyle}>
      {tags.map(tag => {
        const selected = isSelected(tag);
        const isToggling = togglingId === tag.id;
        const disabled = togglingId != null;
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag)}
            disabled={disabled}
            aria-busy={togglingId !== undefined ? isToggling : undefined}
            style={{
              backgroundColor: selected ? tag.color : unselectedBg,
              color: selected ? '#ffffff' : 'var(--tm-text-primary)',
              border: `1px solid ${selected ? tag.color : 'var(--tm-border)'}`,
              ...(scaleAnimation ? { transform: selected ? 'scale(1)' : 'scale(0.97)' } : {}),
              opacity: disabled && !isToggling ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            className={buttonClassName}
          >
            {isToggling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}

export default TagMultiSelect;
