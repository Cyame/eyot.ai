/**
 * Standing system conventions injected as knowledge rows.
 *
 * These are policy text, not a live dump of topology or Hub layout.
 * Adding/removing 兽道 or moving Hub files does not rewrite them.
 * Neighbor routing still uses Passage rows; Hub paths still use the
 * shared/work prefixes at runtime.
 */
export const KNOWLEDGE_CONVENTION_KEYS = ['eyot.collab.passage', 'eyot.hub.shared_work'] as const;

export type KnowledgeConventionKey = (typeof KNOWLEDGE_CONVENTION_KEYS)[number];

export function isKnowledgeConvention(key: string): boolean {
  return (KNOWLEDGE_CONVENTION_KEYS as readonly string[]).includes(key);
}
