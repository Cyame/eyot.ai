import { AlertCircle, Check, Hash, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SubagentChips, { extractSubagentCapabilities } from '@/components/SubagentChips';
import { ApiError } from '@/lib/api';
import { type EntityDetail, fetchBaseClass, patchEntity } from '@/lib/api/entities';
import { resolveError } from '@/lib/apiError';
import type { JsonObject } from '@/lib/types';
import { cn } from '@/lib/utils';

const DISPLAY_NAME_MAX = 32;
const DESCRIPTION_MAX = 500;

type Toast = {
  readonly kind: 'success' | 'error';
  readonly message: string;
};

type BasicTabProps = {
  readonly entity: EntityDetail;
  readonly canEdit: boolean;
  readonly onUpdated: (next: EntityDetail) => void;
  readonly onFindInWorkspace: () => void;
};

export default function BasicTab({ entity, canEdit, onUpdated, onFindInWorkspace }: BasicTabProps) {
  const { t } = useTranslation();

  const initialDisplayName = entity.display_name ?? entity.name;
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [description, setDescription] = useState(entity.description ?? '');
  const [etag, setEtag] = useState(entity.updated_at);
  const [readOnly, setReadOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [slugTaken, setSlugTaken] = useState(false);
  const [displayNameConflict, setDisplayNameConflict] = useState(false);
  const [baseClassManifest, setBaseClassManifest] = useState<JsonObject | null>(null);

  const loadBaseClass = useCallback(async () => {
    if (!entity.base_class_slug) return;
    try {
      const bc = await fetchBaseClass(entity.base_class_slug);
      setBaseClassManifest(bc.manifest);
    } catch {
      setBaseClassManifest(null);
    }
  }, [entity.base_class_slug]);

  useEffect(() => {
    void loadBaseClass();
  }, [loadBaseClass]);

  useEffect(() => {
    setDisplayName(entity.display_name ?? entity.name);
    setDescription(entity.description ?? '');
    setEtag(entity.updated_at);
    setReadOnly(false);
    setSlugTaken(false);
    setDisplayNameConflict(false);
  }, [entity.display_name, entity.name, entity.description, entity.updated_at]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const dirty = useMemo(() => {
    return (
      displayName !== (entity.display_name ?? entity.name) ||
      description !== (entity.description ?? '')
    );
  }, [displayName, description, entity.display_name, entity.name, entity.description]);

  const descriptionCount = description.length;
  const descriptionOverflow = descriptionCount > DESCRIPTION_MAX;
  const displayNameLen = displayName.length;
  const displayNameEmpty = displayNameLen === 0;
  const displayNameTooLong = displayNameLen > DISPLAY_NAME_MAX;
  const formInvalid = displayNameEmpty || displayNameTooLong || descriptionOverflow;

  async function handleSave() {
    if (formInvalid || saving || !canEdit) return;
    setSaving(true);
    setToast(null);
    try {
      const updated = await patchEntity(
        entity.id,
        {
          name: entity.name,
          display_name: displayName,
          display_color: entity.display_color,
          preset_slug: entity.preset_slug,
        },
        etag,
      );
      setEtag(updated.updated_at);
      setSlugTaken(false);
      setDisplayNameConflict(false);
      onUpdated(updated);
      setToast({ kind: 'success', message: t('entityModal.basicTab.saveSuccess') });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 412 || error.status === 409) {
          setReadOnly(true);
          setToast({
            kind: 'error',
            message: t('entityModal.basicTab.saveConflict'),
          });
          return;
        }
        if (error.status === 404) {
          setToast({ kind: 'error', message: t('entityModal.errors.notFound') });
          return;
        }
        setToast({ kind: 'error', message: resolveError(t, error) });
        return;
      }
      setToast({ kind: 'error', message: t('entityModal.errors.save') });
    } finally {
      setSaving(false);
    }
  }

  function reload() {
    setDisplayName(entity.display_name ?? entity.name);
    setDescription(entity.description ?? '');
    setEtag(entity.updated_at);
    setReadOnly(false);
    setSlugTaken(false);
    setDisplayNameConflict(false);
    setToast(null);
  }

  return (
    <section aria-labelledby="basic-tab-heading" className="space-y-5">
      <header className="flex items-center justify-between">
        <h2 id="basic-tab-heading" className="text-sm font-semibold text-ink">
          {t('entityModal.tabs.basic')}
        </h2>
        {dirty && canEdit && !readOnly ? (
          <span
            data-testid="basic-unsaved-badge"
            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
          >
            <ShieldAlert className="size-3" aria-hidden="true" />
            {t('entityModal.basicTab.unsavedBadge')}
          </span>
        ) : null}
      </header>

      {toast ? (
        <div
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm',
            toast.kind === 'error'
              ? 'border-danger/30 bg-danger-soft text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800',
          )}
          data-testid="basic-toast"
        >
          {toast.kind === 'error' ? (
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <Check className="size-4 shrink-0" aria-hidden="true" />
          )}
          <p>{toast.message}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="basic-display-name"
            className="block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            {t('entityModal.basicTab.displayName')}
          </label>
          <input
            id="basic-display-name"
            type="text"
            value={displayName}
            disabled={readOnly || !canEdit}
            maxLength={DISPLAY_NAME_MAX + 8}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDisplayNameConflict(false);
            }}
            placeholder={t('entityModal.basicTab.displayNamePlaceholder')}
            data-testid="basic-display-name"
            className={cn(
              'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2',
              displayNameEmpty || displayNameTooLong || displayNameConflict
                ? 'border-danger/40 focus-visible:ring-red-500'
                : 'border-line-strong focus-visible:ring-brand',
              (readOnly || !canEdit) && 'cursor-not-allowed bg-surface-muted text-muted',
            )}
          />
          {displayNameEmpty ? (
            <p role="alert" className="text-xs text-danger">
              {t('entityModal.basicTab.displayNameRequired')}
            </p>
          ) : displayNameTooLong ? (
            <p role="alert" className="text-xs text-danger">
              {t('entityModal.basicTab.displayNameTooLong')}
            </p>
          ) : displayNameConflict ? (
            <p role="alert" className="text-xs text-danger">
              {t('entityModal.basicTab.displayNameDuplicate')}
            </p>
          ) : (
            <p className="text-xs text-muted">
              {displayNameLen} / {DISPLAY_NAME_MAX}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="basic-slug"
            className="block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            {t('entityModal.basicTab.slug')}
          </label>
          <div className="relative">
            <Hash
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-subtle"
              aria-hidden="true"
            />
            <input
              id="basic-slug"
              type="text"
              value={entity.slug}
              readOnly
              disabled
              title={t('entityModal.basicTab.slugImmutable')}
              data-testid="basic-slug"
              className="w-full rounded-lg border border-line bg-surface-muted pl-9 pr-3 py-2 font-mono text-sm text-ink shadow-sm"
            />
          </div>
          <p className="text-xs text-muted">{t('entityModal.basicTab.slugImmutable')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="basic-description"
          className="block text-xs font-semibold uppercase tracking-wide text-muted"
        >
          {t('entityModal.basicTab.description')}
        </label>
        <textarea
          id="basic-description"
          rows={4}
          value={description}
          disabled={readOnly || !canEdit}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('entityModal.basicTab.descriptionPlaceholder')}
          data-testid="basic-description"
          className={cn(
            'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2',
            descriptionOverflow
              ? 'border-danger/40 focus-visible:ring-red-500'
              : 'border-line-strong focus-visible:ring-brand',
            (readOnly || !canEdit) && 'cursor-not-allowed bg-surface-muted text-muted',
          )}
        />
        <p
          className={cn(
            'text-right text-xs tabular-nums',
            descriptionOverflow ? 'text-danger' : 'text-muted',
          )}
        >
          {t('entityModal.basicTab.descriptionCounter', { count: descriptionCount })}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetaItem
          label={t('entityModal.basicTab.baseClass')}
          value={
            entity.base_class_slug ? (
              <button
                type="button"
                onClick={onFindInWorkspace}
                className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 font-mono text-xs text-brand transition-colors hover:bg-brand-soft"
                title={t('entityModal.basicTab.baseClassTooltip')}
              >
                {entity.base_class_slug}
              </button>
            ) : (
              <span className="text-xs text-muted-subtle">—</span>
            )
          }
        />
        <MetaItem
          label={t('entityModal.basicTab.creator')}
          value={
            entity.creator_email ? (
              <span
                title={t('entityModal.basicTab.creatorTooltip', { email: entity.creator_email })}
                className="text-xs text-ink"
              >
                {entity.creator_email}
              </span>
            ) : (
              <span className="text-xs text-muted-subtle">—</span>
            )
          }
        />
        <MetaItem
          label={t('entityModal.basicTab.workspace')}
          value={
            entity.workspace_id ? (
              <button
                type="button"
                onClick={onFindInWorkspace}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-xs text-ink transition-colors hover:bg-surface-muted"
              >
                {entity.workspace_id}
              </button>
            ) : (
              <span className="text-xs text-muted-subtle">—</span>
            )
          }
        />
        <MetaItem
          label={t('entityModal.basicTab.createdAt')}
          value={<span className="font-mono text-xs text-ink">{entity.created_at}</span>}
        />
      </dl>

      <SubagentChips capabilities={extractSubagentCapabilities(baseClassManifest)} />

      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        {readOnly ? (
          <button
            type="button"
            onClick={reload}
            data-testid="basic-reload"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {t('entityModal.basicTab.reload')}
          </button>
        ) : null}
        {slugTaken ? (
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {t('entityModal.basicTab.revertSlug')}
          </button>
        ) : null}
        {readOnly ? (
          <span className="text-xs text-muted">{t('entityModal.basicTab.formReadOnly')}</span>
        ) : (
          <button
            type="button"
            disabled={!canEdit || !dirty || formInvalid || saving}
            onClick={handleSave}
            data-testid="basic-save"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              !canEdit || !dirty || formInvalid || saving
                ? 'cursor-not-allowed bg-surface-muted text-muted'
                : 'bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active',
            )}
          >
            {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {saving ? t('entityModal.basicTab.saving') : t('entityModal.basicTab.save')}
          </button>
        )}
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface-muted px-3 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
