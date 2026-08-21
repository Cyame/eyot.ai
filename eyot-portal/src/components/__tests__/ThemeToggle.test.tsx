import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import ThemeToggle from '@/components/ThemeToggle';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { useThemeStore } from '@/stores/theme';

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    useThemeStore.setState({ preference: 'system', resolved: 'light' });
  });

  it('cycles system → light → dark and persists the preference', () => {
    render(<ThemeToggle variant="surface" />);
    const button = screen.getByTestId('theme-toggle');
    expect(button).toHaveAttribute('data-theme-preference', 'system');

    fireEvent.click(button);
    expect(button).toHaveAttribute('data-theme-preference', 'light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(button);
    expect(button).toHaveAttribute('data-theme-preference', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(button);
    expect(button).toHaveAttribute('data-theme-preference', 'system');
  });
});
