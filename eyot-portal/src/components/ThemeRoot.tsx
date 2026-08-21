import { type ReactNode, useEffect } from 'react';
import { subscribeSystemTheme, useThemeStore } from '@/stores/theme';

type ThemeRootProps = {
  readonly children: ReactNode;
};

export default function ThemeRoot({ children }: ThemeRootProps) {
  const hydrate = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    return subscribeSystemTheme();
  }, [hydrate]);

  return children;
}
