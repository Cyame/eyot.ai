import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROGENITOR_SLUGS, resolveProgenitorSlug } from '@/lib/progenitorAssets';
import { nextThemePreference, resolveTheme } from '@/lib/theme';

const portalRoot = process.cwd();

describe('theme helpers', () => {
  it('cycles preferences in order', () => {
    expect(nextThemePreference('system')).toBe('light');
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
  });

  it('resolves explicit light and dark without consulting the OS', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });
});

describe('progenitor assets', () => {
  it('resolves exact and prefixed slugs', () => {
    expect(resolveProgenitorSlug('fox')).toBe('fox');
    expect(resolveProgenitorSlug('lion-overseer')).toBe('lion');
    expect(resolveProgenitorSlug('unknown')).toBeNull();
  });

  it('ships an SVG portrait for every progenitor', () => {
    for (const slug of PROGENITOR_SLUGS) {
      const svg = readFileSync(
        join(portalRoot, 'public/assets/progenitors', `${slug}.svg`),
        'utf8',
      );
      expect(svg).toContain('<svg');
      expect(svg.length).toBeGreaterThan(200);
    }
  });
});

describe('visual tokens', () => {
  it('defines the @theme semantic palette and dark variant', () => {
    const css = readFileSync(join(portalRoot, 'src/style.css'), 'utf8');
    expect(css).toContain('@custom-variant dark');
    expect(css).toContain('--color-brand:');
    expect(css).toContain('--color-canvas:');
    expect(css).toContain('--color-progenitor-fox:');
    expect(css).toContain('@keyframes topology-pop');
    expect(css).toContain('.dark {');
  });
});
