import { useTranslation } from 'react-i18next';
import type { JsonObject } from '@/lib/types';

/** Known subagent capability IDs and their i18n keys. */
const CAPABILITY_IDS = [
  'intent',
  'architecture',
  'quality',
  'explore',
  'research',
  'vision',
] as const;

export type SubagentCapabilityId = (typeof CAPABILITY_IDS)[number];

/**
 * Extract the enabled subagent capability list from a manifest JSON object.
 * Returns an empty array if the manifest has no subagent_strategy or enabled list.
 */
export function extractSubagentCapabilities(
  manifest: JsonObject | null | undefined,
): readonly SubagentCapabilityId[] {
  if (manifest === null || manifest === undefined || typeof manifest !== 'object') return [];
  const strategy = manifest.subagent_strategy;
  if (strategy === null || strategy === undefined || typeof strategy !== 'object') return [];
  const enabled = (strategy as JsonObject).enabled;
  if (!Array.isArray(enabled)) return [];
  return enabled.filter(
    (id): id is SubagentCapabilityId =>
      typeof id === 'string' && (CAPABILITY_IDS as readonly string[]).includes(id),
  );
}

type SubagentChipsProps = {
  readonly capabilities: readonly SubagentCapabilityId[];
  readonly variant?: 'list' | 'tag';
};

/** Render subagent capability chips, or a compact 子代理 tag. */
export default function SubagentChips({ capabilities, variant = 'list' }: SubagentChipsProps) {
  const { t } = useTranslation();
  if (capabilities.length === 0) return null;

  if (variant === 'tag') {
    const names = capabilities.map((cap) => t(`subagent.${cap}`)).join(', ');
    return (
      <span
        data-testid="subagent-tag"
        title={names}
        className="inline-flex shrink-0 items-center rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"
      >
        {t('subagent.tag')}
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <p
        className="text-xs font-semibold uppercase tracking-wide text-muted"
        data-testid="subagent-chips-heading"
      >
        {t('subagent.heading')}
      </p>
      <ul
        className="flex flex-wrap gap-1.5"
        data-testid="subagent-chips"
        aria-label={t('subagent.heading')}
      >
        {capabilities.map((cap) => (
          <li
            key={cap}
            data-testid={`subagent-chip-${cap}`}
            className="inline-flex items-center rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"
          >
            {t(`subagent.${cap}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
