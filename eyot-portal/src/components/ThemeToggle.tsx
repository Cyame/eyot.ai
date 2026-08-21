import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { nextThemePreference, type ThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/theme';

type ThemeToggleProps = {
  readonly variant?: 'sidebar' | 'surface';
};

const ICON_FOR_PREF: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export default function ThemeToggle({ variant = 'sidebar' }: ThemeToggleProps) {
  const { t } = useTranslation();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const Icon = ICON_FOR_PREF[preference];
  const next = nextThemePreference(preference);

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      data-theme-preference={preference}
      aria-label={t('theme.toggle', { next: t(`theme.${next}`) })}
      title={t(`theme.${preference}`)}
      onClick={() => setPreference(next)}
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        variant === 'sidebar'
          ? 'text-nav-muted hover:bg-nav-hover hover:text-nav-ink'
          : 'border border-line bg-surface text-ink hover:bg-surface-muted',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
