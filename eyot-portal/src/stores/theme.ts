import { create } from 'zustand';
import {
  applyTheme,
  type ResolvedTheme,
  readThemePreference,
  resolveTheme,
  type ThemePreference,
  writeThemePreference,
} from '@/lib/theme';

type ThemeState = {
  readonly preference: ThemePreference;
  readonly resolved: ResolvedTheme;
  readonly hydrate: () => void;
  readonly setPreference: (preference: ThemePreference) => void;
};

function snapshot(preference: ThemePreference): Pick<ThemeState, 'preference' | 'resolved'> {
  return { preference, resolved: applyTheme(preference) };
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  resolved: 'light',
  hydrate: () => {
    set(snapshot(readThemePreference()));
  },
  setPreference: (preference) => {
    writeThemePreference(preference);
    set(snapshot(preference));
  },
}));

/** Keep `resolved` in sync when the OS scheme changes and preference is `system`. */
export function subscribeSystemTheme(): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    const { preference } = useThemeStore.getState();
    if (preference !== 'system') return;
    useThemeStore.setState({ resolved: resolveTheme('system') });
    applyTheme('system');
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
