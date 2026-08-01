/** Editor color themes. `id` maps to `.mdc-app[data-theme="<id>"]` in themes.css. */
export interface Theme {
  id: string;
  label: string;
  dark: boolean;
  /** Swatch color shown in the theme picker. */
  swatch: string;
}

export const THEMES: Theme[] = [
  { id: 'violet', label: 'Violeta', dark: true, swatch: '#7c3aed' },
  { id: 'crimson', label: 'Carmesí', dark: true, swatch: '#e11d48' },
  { id: 'ocean', label: 'Océano', dark: true, swatch: '#22d3ee' },
  { id: 'paper', label: 'Papel', dark: false, swatch: '#e7e2d3' },
  { id: 'frost', label: 'Escarcha', dark: false, swatch: '#2563eb' },
];

export const DEFAULT_THEME = 'violet';

const LEGACY: Record<string, string> = { dark: 'violet', light: 'paper' };

/** Resolves a stored value (including the old light/dark toggle) to a theme id. */
export function resolveTheme(stored: string | null): string {
  if (!stored) return DEFAULT_THEME;
  if (THEMES.some((t) => t.id === stored)) return stored;
  return LEGACY[stored] ?? DEFAULT_THEME;
}

export function isDarkTheme(id: string): boolean {
  return THEMES.find((t) => t.id === id)?.dark ?? true;
}
