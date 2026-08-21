export const PROGENITOR_SLUGS = ['fox', 'beaver', 'sparrow', 'coyote', 'lion'] as const;

export type ProgenitorSlug = (typeof PROGENITOR_SLUGS)[number];

export const PROGENITOR_ACCENT_CLASS: Record<ProgenitorSlug, string> = {
  fox: 'ring-progenitor-fox',
  beaver: 'ring-progenitor-beaver',
  sparrow: 'ring-progenitor-sparrow',
  coyote: 'ring-progenitor-coyote',
  lion: 'ring-progenitor-lion',
};

export function isProgenitorSlug(slug: string | null | undefined): slug is ProgenitorSlug {
  return (
    slug !== null && slug !== undefined && (PROGENITOR_SLUGS as readonly string[]).includes(slug)
  );
}

/**
 * Resolve a known progenitor slug from an entity / membership slug.
 * Topology currently stores `entity_slug` (not `preset_slug`); accept exact
 * animal slugs and `{slug}-…` prefixes so avatars still land without a
 * schema change.
 */
export function resolveProgenitorSlug(slug: string | null | undefined): ProgenitorSlug | null {
  if (slug === null || slug === undefined || slug === '') return null;
  const lower = slug.toLowerCase();
  if (isProgenitorSlug(lower)) return lower;
  for (const progenitor of PROGENITOR_SLUGS) {
    if (lower.startsWith(`${progenitor}-`)) return progenitor;
  }
  return null;
}

export function progenitorAvatarSrc(slug: ProgenitorSlug): string {
  return `/assets/progenitors/${slug}.svg`;
}
