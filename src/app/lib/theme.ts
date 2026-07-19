// Lets the user pick the app's accent color from the same palette offered
// for tag categories (see tagColors.ts), while keeping the Maruman Spiral
// Note Basic look (kraft-brown default, everything else in globals.css
// untouched). The chosen color only overrides --tm-accent and the values
// derived from it; surfaces, borders, and ink stay fixed.

export const THEME_ACCENT_STORAGE_KEY = 'tm_theme_accent';

// The kraft-brown accent defined in globals.css — offered as the "reset" option.
export const DEFAULT_ACCENT = '#7A5A32';

// WCAG relative luminance, used to pick readable text (dark ink vs. cream)
// on top of whatever accent color is chosen.
export function relativeLuminance(hex: string): number {
  const channels = hex.replace('#', '').match(/.{2}/g)?.map(v => parseInt(v, 16) / 255) ?? [0, 0, 0];
  const [r, g, b] = channels.map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function applyThemeColor(hex: string): void {
  const root = document.documentElement.style;
  root.setProperty('--tm-accent', hex);
  root.setProperty('--tm-accent-hover', `color-mix(in srgb, ${hex} 72%, black)`);
  root.setProperty('--tm-accent-subtle', `color-mix(in srgb, ${hex} 16%, var(--tm-surface))`);
  root.setProperty('--tm-accent-text', relativeLuminance(hex) > 0.45 ? '#2B2620' : '#FBF8EE');
}

export function getStoredThemeColor(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(THEME_ACCENT_STORAGE_KEY);
}

export function setStoredThemeColor(hex: string): void {
  localStorage.setItem(THEME_ACCENT_STORAGE_KEY, hex);
  applyThemeColor(hex);
}

// Reverts to the notebook's default kraft-brown accent and forgets the override.
export function resetThemeColor(): void {
  localStorage.removeItem(THEME_ACCENT_STORAGE_KEY);
  applyThemeColor(DEFAULT_ACCENT);
}
