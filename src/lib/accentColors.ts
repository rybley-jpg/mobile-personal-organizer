export interface AccentPreset {
  id: string;
  name: string;
  shades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'blue',
    name: 'Blau',
    shades: {
      50: '#eff8ff',
      100: '#dbeefe',
      200: '#bfe3fe',
      300: '#93d1fd',
      400: '#60b7fa',
      500: '#3b9cf3',
      600: '#2280e0',
      700: '#1c68c0',
      800: '#1c569c',
      900: '#1d497d',
      950: '#152e4f',
    },
  },
  {
    id: 'yellow',
    name: 'Gelb',
    shades: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03',
    },
  },
  {
    id: 'red',
    name: 'Rot',
    shades: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
      950: '#450a0a',
    },
  },
  {
    id: 'green',
    name: 'Grün',
    shades: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
  },
];

const LEGACY_ACCENT_IDS: Record<string, string> = {
  teal: 'green',
  cyan: 'blue',
  orange: 'yellow',
  amber: 'yellow',
  rose: 'red',
};

export const DEFAULT_ACCENT_ID = 'blue';

export function resolveAccentId(id: string | null | undefined): string {
  const mapped = id ? (LEGACY_ACCENT_IDS[id] ?? id) : DEFAULT_ACCENT_ID;
  return ACCENT_PRESETS.some((p) => p.id === mapped) ? mapped : DEFAULT_ACCENT_ID;
}

export function applyAccentPreset(preset: AccentPreset) {
  const root = document.documentElement;
  Object.entries(preset.shades).forEach(([key, value]) => {
    root.style.setProperty(`--c-primary-${key}`, value);
  });
}

export function getAccentPresetById(id: string): AccentPreset {
  const resolved = resolveAccentId(id);
  return ACCENT_PRESETS.find((p) => p.id === resolved) ?? ACCENT_PRESETS[0];
}
