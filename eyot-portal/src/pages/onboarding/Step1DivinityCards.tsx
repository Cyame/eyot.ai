import { AlertCircle, Check, Filter, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProgenitorAvatar from '@/components/ProgenitorAvatar';
import { ApiError } from '@/lib/api';
import { fetchBaseClasses } from '@/lib/api/onboarding';
import { resolveError } from '@/lib/apiError';
import { normalizeBaseClassTags, translateBaseClassTag } from '@/lib/baseClassTags';
import type { BaseClass, JsonObject } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/stores/onboardingStore';

type GroupFilter = 'all' | string;

const INTERNAL_SLUGS = new Set(['cerebellum-baseclass']);
const INTERNAL_TAGS = new Set(['internal', 'system']);

/** Default tags when API omits them - free-form, not a closed enum. */
const DEFAULT_TAGS_FOR_SLUG: Record<string, readonly string[]> = {
  fox: ['planning'],
  beaver: ['ultraworker', 'execution'],
  sparrow: ['execution'],
  coyote: ['execution'],
  lion: ['delegate', 'planning'],
};

const TAG_CLASSES: Record<string, string> = {
  planning: 'bg-brand-soft text-brand border-brand/30',
  execution: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  review: 'bg-violet-50 text-violet-700 border-violet-200',
  ultraworker: 'bg-orange-50 text-orange-800 border-orange-200',
  scout: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  oracle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  gate: 'bg-amber-50 text-amber-800 border-amber-200',
  multimodal: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
  delegate: 'bg-surface-muted text-ink border-line-strong',
};

const DEFAULT_TAG_CLASS = 'bg-surface-muted text-ink border-line';

function resolveTags(baseClass: BaseClass): readonly string[] {
  const fromApi = normalizeBaseClassTags(baseClass.tags);
  if (fromApi.length > 0) return fromApi;
  return DEFAULT_TAGS_FOR_SLUG[baseClass.slug] ?? [];
}

function isInternalBaseClass(baseClass: BaseClass): boolean {
  if (INTERNAL_SLUGS.has(baseClass.slug)) return true;
  return resolveTags(baseClass).some((tag) => INTERNAL_TAGS.has(tag));
}

function primaryTag(baseClass: BaseClass): string {
  return resolveTags(baseClass)[0] ?? 'untagged';
}

function extractCommands(manifest: JsonObject | null): readonly string[] {
  if (manifest === null) return [];
  // manifest here comes from GET /base-classes — the server merges the
  // junction aggregate into manifest.commands (read-only mirror), never the
  // DB-embedded write truth.
  const value = manifest.commands;
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function extractProvider(manifest: JsonObject | null): string | null {
  if (manifest === null) return null;
  const config = manifest.provider_config;
  if (typeof config === 'object' && config !== null) {
    const type = (config as JsonObject).type;
    if (typeof type === 'string') return type;
  }
  const defaultModel = manifest.default_model;
  if (typeof defaultModel === 'string') return defaultModel;
  return null;
}

type Step1Props = {
  readonly onLoadingChange?: (isLoading: boolean) => void;
  readonly onErrorChange?: (error: string | null) => void;
};

export default function Step1DivinityCards({ onLoadingChange, onErrorChange }: Step1Props) {
  const { t } = useTranslation();
  const selectedBaseClass = useOnboardingStore((state) => state.selectedBaseClass);
  const setSelectedBaseClass = useOnboardingStore((state) => state.setSelectedBaseClass);

  const [classes, setClasses] = useState<readonly BaseClass[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  useEffect(() => {
    let isActive = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      if (onLoadingChange) onLoadingChange(true);
      if (onErrorChange) onErrorChange(null);
      try {
        const items = await fetchBaseClasses();
        if (!isActive) return;
        setClasses(items);
        if (items.length === 0) {
          if (onErrorChange) onErrorChange(t('onboarding.step1.fallbackDisclaimer'));
        }
      } catch (error) {
        if (!isActive) return;
        if (error instanceof ApiError) {
          const msg = resolveError(t, error);
          setErrorMessage(msg);
          if (onErrorChange) onErrorChange(msg);
        } else {
          setErrorMessage(t('onboarding.loadBaseClassesFailed'));
          if (onErrorChange) onErrorChange(t('onboarding.loadBaseClassesFailed'));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          if (onLoadingChange) onLoadingChange(false);
        }
      }
    }
    void load();
    return () => {
      isActive = false;
    };
  }, [onErrorChange, onLoadingChange, t]);

  const dataSource: readonly BaseClass[] = useMemo(() => {
    const source = classes ?? [];
    return source.filter((entry) => !isInternalBaseClass(entry));
  }, [classes]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const entry of dataSource) {
      for (const tag of resolveTags(entry)) {
        if (!INTERNAL_TAGS.has(tag)) set.add(tag);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [dataSource]);

  const filtered: readonly BaseClass[] = useMemo(() => {
    if (groupFilter === 'all') return dataSource;
    return dataSource.filter((entry) => resolveTags(entry).includes(groupFilter));
  }, [dataSource, groupFilter]);

  const selectedId = selectedBaseClass?.id ?? null;

  const groups: ReadonlyArray<{ readonly id: GroupFilter; readonly label: string }> = [
    { id: 'all', label: t('onboarding.step1.tagFilterAll') },
    ...availableTags.map((tag) => ({ id: tag, label: translateBaseClassTag(tag, t) })),
  ];

  return (
    <div className="space-y-5" data-testid="onboarding-step1">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink">{t('onboarding.step1.title')}</h3>
        <p className="text-sm text-muted">{t('onboarding.step1.subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tag filter">
        {groups.map((group) => {
          const isActive = groupFilter === group.id;
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setGroupFilter(group.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                isActive
                  ? 'bg-brand text-brand-fg shadow-sm'
                  : 'bg-surface-muted text-muted hover:bg-surface-muted',
              )}
            >
              {group.id === 'all' ? <Filter className="size-3.5" aria-hidden="true" /> : null}
              {group.label}
            </button>
          );
        })}
      </div>

      {errorMessage !== null && classes === null ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setIsLoading(true);
              void (async () => {
                try {
                  const items = await fetchBaseClasses();
                  setClasses(items);
                } catch (error) {
                  setErrorMessage(resolveError(t, error, 'onboarding.loadBaseClassesFailed'));
                } finally {
                  setIsLoading(false);
                }
              })();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-surface px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {isLoading && classes === null ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-surface-muted py-12 text-sm text-muted">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </div>
      ) : (
        <fieldset>
          <legend className="sr-only">{t('onboarding.step1.title')}</legend>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => {
              const isSelected = entry.id === selectedId;
              const tags = resolveTags(entry);
              const lead = primaryTag(entry);
              const commands = extractCommands(entry.manifest);
              const providerInfo = extractProvider(entry.manifest);
              const displayName = t(entry.display_name ?? entry.name, { defaultValue: entry.name });
              return (
                <label
                  key={entry.id}
                  data-testid={`deity-card-${entry.slug}`}
                  className={cn(
                    'flex w-full cursor-pointer flex-col items-start gap-3 rounded-xl border bg-surface p-4 text-left shadow-sm transition-[border-color,box-shadow,transform] focus-within:ring-2 focus-within:ring-brand',
                    isSelected
                      ? 'border-brand ring-2 ring-brand/20 shadow-md -translate-y-0.5'
                      : 'border-line hover:border-line-strong hover:shadow-md',
                  )}
                >
                  <input
                    type="radio"
                    name="deity-selection"
                    value={entry.id}
                    checked={isSelected}
                    onChange={() => setSelectedBaseClass(isSelected ? null : entry)}
                    aria-label={displayName}
                    className="sr-only"
                  />
                  <div className="flex w-full items-start justify-between gap-2">
                    <ProgenitorAvatar slug={entry.slug} label={displayName} size="md" />
                    {isSelected ? (
                      <span className="grid size-5 place-items-center rounded-full bg-brand text-brand-fg">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-base font-semibold text-ink">{displayName}</h4>
                    <p className="mt-0.5 font-mono text-xs text-muted">{entry.slug}</p>
                  </div>

                  {entry.description !== null ? (
                    <p className="line-clamp-2 text-xs text-muted">{entry.description}</p>
                  ) : null}

                  {commands.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {commands.slice(0, 3).map((command) => (
                        <span
                          key={command}
                          className="rounded-full border border-brand/20 bg-brand-soft px-2 py-0.5 font-mono text-[11px] text-brand"
                        >
                          {command}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex w-full flex-wrap items-center gap-1.5 pt-1">
                    {tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                          TAG_CLASSES[tag] ?? DEFAULT_TAG_CLASS,
                          tag === lead ? 'ring-1 ring-offset-1 ring-line-strong' : '',
                        )}
                      >
                        {translateBaseClassTag(tag, t)}
                      </span>
                    ))}
                    {providerInfo !== null ? (
                      <span
                        className="ml-auto truncate font-mono text-[11px] text-muted"
                        title={providerInfo}
                      >
                        {t('onboarding.step1.providerLabel')}: {providerInfo}
                      </span>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {selectedBaseClass === null ? (
        <p className="text-xs text-muted" aria-live="polite">
          {t('onboarding.step1.selectHint')}
        </p>
      ) : null}
    </div>
  );
}
