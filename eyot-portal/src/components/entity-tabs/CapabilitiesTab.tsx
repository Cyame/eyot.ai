import { ChevronDown, ChevronRight, Trash2, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import type { EntityDetail } from '@/lib/api/entities';
import type { Capability, CapabilityType } from '@/lib/types';
import { cn } from '@/lib/utils';

type ViewMode = 'by_type' | 'by_source' | 'flat';

const TYPE_ORDER: readonly CapabilityType[] = ['skill', 'tool', 'mcp', 'lsp'];

type CapabilitiesTabProps = {
  readonly entity: EntityDetail;
  readonly onGoToGenes: () => void;
  readonly onRemove: (capability: Capability) => void;
};

export default function CapabilitiesTab({ entity, onGoToGenes, onRemove }: CapabilitiesTabProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>('by_type');
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const capabilities = useMemo(
    () => (Array.isArray(entity.capabilities) ? entity.capabilities : []),
    [entity.capabilities],
  );
  const byType = useMemo(() => groupByType(capabilities), [capabilities]);
  const bySource = useMemo(() => groupBySource(capabilities), [capabilities]);

  return (
    <section aria-labelledby="capabilities-tab-heading" className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="capabilities-tab-heading" className="text-sm font-semibold text-ink">
          {t('entityModal.tabs.capabilities')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToGenes}
            data-testid="capabilities-manage-genes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Wand2 className="size-3.5" aria-hidden="true" />
            {t('entityModal.capabilitiesTab.manageGenes')}
          </button>
        </div>
      </header>

      <div
        role="radiogroup"
        aria-label={t('entityModal.capabilitiesTab.viewModeAria')}
        className="flex flex-wrap gap-2 rounded-lg border border-line bg-surface-muted p-1"
      >
        {(['by_type', 'by_source', 'flat'] as const).map((mode) => {
          const labelKey =
            mode === 'by_type'
              ? 'viewModeByType'
              : mode === 'by_source'
                ? 'viewModeBySource'
                : 'viewModeFlat';
          const checked = view === mode;
          return (
            <label
              key={mode}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
                checked ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              <input
                type="radio"
                name="capabilities-view"
                value={mode}
                checked={checked}
                onChange={() => setView(mode)}
                data-testid={`capabilities-view-${mode}`}
                className="sr-only"
              />
              {t(`entityModal.capabilitiesTab.${labelKey}`)}
            </label>
          );
        })}
      </div>

      {capabilities.length === 0 ? (
        <EmptyState
          title={t('entityModal.capabilitiesTab.emptyTitle')}
          description={t('entityModal.capabilitiesTab.emptyDetail')}
        />
      ) : view === 'by_type' ? (
        <CapabilityListByType
          groups={byType}
          collapsed={collapsed}
          onToggle={toggleGroup}
          onRemove={onRemove}
        />
      ) : view === 'by_source' ? (
        <CapabilityListBySource
          groups={bySource}
          collapsed={collapsed}
          onToggle={toggleGroup}
          onRemove={onRemove}
        />
      ) : (
        <CapabilityFlatList capabilities={capabilities} onRemove={onRemove} />
      )}
    </section>
  );
}

type Group = {
  readonly key: string;
  readonly label: string;
  readonly items: readonly Capability[];
};

function groupByType(items: readonly Capability[]): readonly Group[] {
  const map = new Map<CapabilityType, Capability[]>();
  for (const t of TYPE_ORDER) map.set(t, []);
  for (const cap of items) {
    const list = map.get(cap.type) ?? [];
    list.push(cap);
    map.set(cap.type, list);
  }
  return TYPE_ORDER.filter((t) => (map.get(t)?.length ?? 0) > 0).map((t) => ({
    key: `type:${t}`,
    label: t,
    items: map.get(t) ?? [],
  }));
}

function groupBySource(items: readonly Capability[]): readonly Group[] {
  const map = new Map<'from_base_class' | 'extra_added', Capability[]>([
    ['from_base_class', []],
    ['extra_added', []],
  ]);
  for (const cap of items) {
    const list = map.get(cap.source) ?? [];
    list.push(cap);
    map.set(cap.source, list);
  }
  const out: Group[] = [];
  const fbc = map.get('from_base_class') ?? [];
  if (fbc.length > 0)
    out.push({ key: 'src:from_base_class', label: 'from_base_class', items: fbc });
  const extra = map.get('extra_added') ?? [];
  if (extra.length > 0) out.push({ key: 'src:extra_added', label: 'extra_added', items: extra });
  return out;
}

function CapabilityListByType({
  groups,
  collapsed,
  onToggle,
  onRemove,
}: {
  readonly groups: readonly Group[];
  readonly collapsed: ReadonlySet<string>;
  readonly onToggle: (key: string) => void;
  readonly onRemove: (cap: Capability) => void;
}) {
  return (
    <ul className="space-y-2" data-testid="capabilities-by-type">
      {groups.map((group) => (
        <li key={group.key} className="overflow-hidden rounded-lg border border-line bg-surface">
          <button
            type="button"
            onClick={() => onToggle(group.key)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface-muted"
          >
            <span className="inline-flex items-center gap-2">
              {collapsed.has(group.key) ? (
                <ChevronRight className="size-4 text-muted" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4 text-muted" aria-hidden="true" />
              )}
              {group.label}
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs tabular-nums text-muted">
                {group.items.length}
              </span>
            </span>
          </button>
          {!collapsed.has(group.key) ? (
            <CapabilityRows items={group.items} onRemove={onRemove} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CapabilityListBySource({
  groups,
  collapsed,
  onToggle,
  onRemove,
}: {
  readonly groups: readonly Group[];
  readonly collapsed: ReadonlySet<string>;
  readonly onToggle: (key: string) => void;
  readonly onRemove: (cap: Capability) => void;
}) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-2" data-testid="capabilities-by-source">
      {groups.map((group) => {
        const labelKey =
          group.label === 'from_base_class' ? 'sourceFromBaseClass' : 'sourceExtraAdded';
        return (
          <li key={group.key} className="overflow-hidden rounded-lg border border-line bg-surface">
            <button
              type="button"
              onClick={() => onToggle(group.key)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface-muted"
            >
              <span className="inline-flex items-center gap-2">
                {collapsed.has(group.key) ? (
                  <ChevronRight className="size-4 text-muted" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-4 text-muted" aria-hidden="true" />
                )}
                {t(`entityModal.capabilitiesTab.${labelKey}`)}
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs tabular-nums text-muted">
                  {group.items.length}
                </span>
              </span>
            </button>
            {!collapsed.has(group.key) ? (
              <CapabilityRows items={group.items} onRemove={onRemove} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function CapabilityFlatList({
  capabilities,
  onRemove,
}: {
  readonly capabilities: readonly Capability[];
  readonly onRemove: (cap: Capability) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <table className="min-w-full divide-y divide-line text-sm" data-testid="capabilities-flat">
        <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2">name</th>
            <th className="px-3 py-2">type</th>
            <th className="px-3 py-2">version</th>
            <th className="px-3 py-2">source</th>
            <th className="px-3 py-2 text-right">operation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">
          {capabilities.map((cap) => (
            <tr key={cap.name}>
              <td className="px-3 py-2 font-mono text-xs text-ink">{cap.name}</td>
              <td className="px-3 py-2 text-xs text-ink">{cap.type}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted">{cap.version ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-ink">{cap.source}</td>
              <td className="px-3 py-2 text-right">
                {cap.source === 'extra_added' ? (
                  <RemoveButton onClick={() => onRemove(cap)} />
                ) : (
                  <span className="text-xs text-muted-subtle">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CapabilityRows({
  items,
  onRemove,
}: {
  readonly items: readonly Capability[];
  readonly onRemove: (cap: Capability) => void;
}) {
  return (
    <ul className="divide-y divide-line-subtle border-t border-line-subtle">
      {items.map((cap) => (
        <li
          key={cap.name}
          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          data-testid={`capability-row-${cap.name}`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-ink">{cap.name}</p>
            <p className="text-xs text-muted">
              <span className="font-mono">{cap.version ?? '—'}</span>
              <span className="mx-1.5 text-nav-muted">·</span>
              <SourceChip source={cap.source} />
            </p>
          </div>
          {cap.source === 'extra_added' ? (
            <RemoveButton onClick={() => onRemove(cap)} />
          ) : (
            <span className="text-xs text-muted-subtle">—</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function SourceChip({ source }: { readonly source: Capability['source'] }) {
  const { t } = useTranslation();
  const labelKey = source === 'from_base_class' ? 'sourceFromBaseClass' : 'sourceExtraAdded';
  const isBase = source === 'from_base_class';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        isBase
          ? 'border-orange-200 bg-orange-50 text-orange-800'
          : 'border-brand/30 bg-brand-soft text-brand',
      )}
    >
      {t(`entityModal.capabilitiesTab.${labelKey}`)}
    </span>
  );
}

function RemoveButton({ onClick }: { readonly onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="capability-remove"
      className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-danger transition-colors hover:border-danger/30 hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
      {t('entityModal.capabilitiesTab.remove')}
    </button>
  );
}
