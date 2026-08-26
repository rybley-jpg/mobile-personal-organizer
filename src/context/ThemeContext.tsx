import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ACCENT_PRESETS, AccentPreset, applyAccentPreset, getAccentPresetById } from '@/lib/accentColors';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  accentId: string;
  setAccentId: (id: string) => void;
  accentPresets: AccentPreset[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('klarly-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialAccentId(): string {
  const stored = localStorage.getItem('klarly-accent');
  return stored && ACCENT_PRESETS.some((p) => p.id === stored) ? stored : 'blue';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accentId, setAccentIdState] = useState<string>(getInitialAccentId);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('klarly-theme', theme);
  }, [theme]);

  useEffect(() => {
    const preset = getAccentPresetById(accentId);
    applyAccentPreset(preset);
    localStorage.setItem('klarly-accent', accentId);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', preset.shades[600]);
  }, [accentId]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  const setAccentId = (id: string) => setAccentIdState(id);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentId, setAccentId, accentPresets: ACCENT_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
