// Shared shape for a curated, fixed color list a swatch picker can render
// — see components/common/ColorSwatchPicker.tsx.
export interface ColorOption {
  // Stable key (not the hex value) — safe to key React lists and future
  // backend records on even if the hex shade is retuned later.
  id: string;
  label: string;
  value: string;
}
