'use client';

/**
 * Circular swatch-grid picker for choosing from a curated, fixed color
 * list — shared by the theme accent picker (Settings → Appearance) and the
 * tag-category color pickers (Create/Edit Tag). Renders whatever `colors`
 * it's given, so any future palette (a bigger one, or one fetched from the
 * backend) just plugs in without touching this component.
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { ColorOption } from '@/app/lib/colorOptions';
import { relativeLuminance } from '@/app/lib/theme';

interface ColorSwatchPickerProps {
  colors: ColorOption[];
  value: string;
  onChange: (hex: string) => void;
  columns?: number;
  // Hex of the swatch (if any) that should carry a subtle "default" ring.
  defaultValue?: string;
}

export default function ColorSwatchPicker({ colors, value, onChange, columns = 7, defaultValue }: ColorSwatchPickerProps) {
  const [hovered, setHovered] = useState<ColorOption | null>(null);

  const selected = colors.find(c => c.value.toLowerCase() === value.toLowerCase());
  const active = hovered ?? selected;
  const activeLabel = active?.label ?? 'Custom';
  const activeSwatch = active?.value ?? value;

  return (
    <div className="space-y-3">
      {/* Live label — swaps between the hovered swatch and the current selection. */}
      <div className="flex items-center gap-2 h-5 text-xs font-semibold" style={{ color: 'var(--tm-text-primary)' }}>
        <span
          key={activeSwatch}
          className="inline-block w-3 h-3 rounded-full shrink-0 animate-fade-in"
          style={{ backgroundColor: activeSwatch, boxShadow: `0 0 0 3px color-mix(in srgb, ${activeSwatch} 20%, transparent)` }}
        />
        <span key={`${activeSwatch}-label`} className="animate-fade-in">{activeLabel}</span>
      </div>

      <div className="grid gap-x-2 gap-y-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {colors.map(c => {
          const isSelected = value.toLowerCase() === c.value.toLowerCase();
          const isDefault = !!defaultValue && c.value.toLowerCase() === defaultValue.toLowerCase();
          const ink = relativeLuminance(c.value) > 0.45 ? '#171717' : '#FFFFFF';
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.value)}
              onMouseEnter={() => setHovered(c)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(c)}
              onBlur={() => setHovered(null)}
              title={c.label}
              aria-label={c.label}
              aria-pressed={isSelected}
              className="group relative aspect-square w-full rounded-full transition-transform duration-200 ease-[var(--tm-ease-spring)] hover:scale-[1.15] hover:-translate-y-0.5 focus-visible:scale-[1.15] focus-visible:outline-none"
              style={{
                backgroundColor: c.value,
                boxShadow: isSelected
                  ? `0 0 0 2px var(--tm-surface), 0 0 0 4px ${c.value}`
                  : isDefault
                    ? `inset 0 0 0 1.5px color-mix(in srgb, ${ink} 35%, transparent), 0 0 0 1px var(--tm-border)`
                    : '0 0 0 1px var(--tm-border)',
              }}
            >
              {isSelected && (
                <Check className="w-3.5 h-3.5 absolute inset-0 m-auto animate-swatch-pop" style={{ color: ink }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
