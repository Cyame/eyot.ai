import { AlertCircle, LoaderCircle, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import {
  createNamespace,
  deleteNamespace,
  fetchNamespaces,
  type NamespaceWithStats,
  updateNamespace,
} from '@/lib/api/namespaces';
import {
  fetchDefaultOrganization,
  generateDescription,
  type Organization,
  updateDefaultOrganization,
} from '@/lib/api/providers';
import { resolveError } from '@/lib/apiError';
import { toSlug } from '@/lib/slug';

type WorldProps = {
  readonly canWrite: boolean;
  readonly orgId?: string;
};

export function OrganizationWorldPanel({ canWrite, orgId }: WorldProps) {
  const { t } = useTranslation();
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchDefaultOrganization(orgId);
      setOrg(data);
      setName(data.name);
      setDescription(data.description ?? '');
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setIsLoading(false);
    }
  }, [orgId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!canWrite) return;
    setBusy(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      const next = await updateDefaultOrganization(
        {
          name,
          description: description.trim() || null,
        },
        orgId,
      );
      setOrg(next);
      setNotice(t('organization.world.saved'));
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!name.trim()) return;
    setGenerating(true);
    setErrorMessage(null);
    try {
      const out = await generateDescription({
        name: name.trim(),
        description: description.trim() || null,
        kind: 'world',
      });
      setDescription(out.description);
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">{t('organization.world.title')}</h2>
      {errorMessage ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">{t('organization.world.name')}</span>
        <input
          value={name}
          disabled={!canWrite}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm disabled:bg-surface-muted"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">{t('organization.world.slug')}</span>
        <input
          value={org?.slug ?? ''}
          disabled
          className="w-full rounded-lg border border-line bg-surface-muted px-3 py-2 font-mono text-sm text-muted"
        />
      </label>
      <div className="block text-sm">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-medium text-ink">{t('organization.world.description')}</span>
          {canWrite ? (
            <button
              type="button"
              disabled={generating || !name.trim()}
              onClick={() => void handleGenerate()}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink hover:bg-surface-muted disabled:opacity-50"
            >
              {generating ? (
                <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-3" aria-hidden="true" />
              )}
              {t('organization.generateDescription')}
            </button>
          ) : null}
        </div>
        <textarea
          value={description}
          disabled={!canWrite}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm disabled:bg-surface-muted"
        />
      </div>
      {canWrite ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => void handleSave()}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg disabled:opacity-60"
          >
            {t('common.save')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

type NsProps = {
  readonly canWrite: boolean;
  readonly orgId?: string;
  readonly onOpenNamespace?: (ns: NamespaceWithStats) => void;
};

type NsDraft = {
  readonly id: string | null;
  name: string;
  slug: string;
  description: string;
};

export function OrganizationNamespacesPanel({ canWrite, orgId, onOpenNamespace }: NsProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<readonly NamespaceWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<NsDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const page = await fetchNamespaces();
      setItems(page.items);
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const slugify = (value: string) => toSlug(value, 48);

  function openCreate() {
    setDraft({ id: null, name: '', slug: '', description: '' });
  }

  function openEdit(ns: NamespaceWithStats) {
    setDraft({
      id: ns.id,
      name: ns.name,
      slug: ns.slug,
      description: ns.description ?? '',
    });
  }

  async function handleGenerate() {
    if (!draft?.name.trim()) return;
    setGenerating(true);
    setErrorMessage(null);
    try {
      const out = await generateDescription({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        kind: 'namespace',
      });
      setDraft({ ...draft, description: out.description });
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!canWrite || !draft) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      if (draft.id) {
        await updateNamespace(draft.id, {
          name: draft.name.trim(),
          description: draft.description.trim() || null,
        });
      } else {
        await createNamespace({
          name: draft.name.trim(),
          slug: (draft.slug.trim() || slugify(draft.name)).slice(0, 48),
          description: draft.description.trim() || null,
          org_id: orgId ?? null,
        });
      }
      setDraft(null);
      await load();
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          {t('organization.namespacesAdmin.title')}
        </h2>
        {canWrite ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('organization.namespacesAdmin.create')}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {draft ? (
        <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">
                {t('organization.namespacesAdmin.name')}
              </span>
              <input
                value={draft.name}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: next,
                          slug:
                            prev.id || (prev.slug && prev.slug !== slugify(prev.name))
                              ? prev.slug
                              : slugify(next),
                        }
                      : prev,
                  );
                }}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">
                {t('organization.namespacesAdmin.slug')}
              </span>
              <input
                value={draft.slug}
                disabled={draft.id !== null}
                onChange={(e) =>
                  setDraft((prev) => (prev ? { ...prev, slug: slugify(e.target.value) } : prev))
                }
                className="w-full rounded-lg border border-line px-3 py-2 font-mono text-sm disabled:bg-surface-muted"
              />
            </label>
          </div>
          <div className="mt-3 block text-sm">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-ink">
                {t('organization.namespacesAdmin.description')}
              </span>
              <button
                type="button"
                disabled={generating || !draft.name.trim()}
                onClick={() => void handleGenerate()}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink hover:bg-surface-muted disabled:opacity-50"
              >
                {generating ? (
                  <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-3" aria-hidden="true" />
                )}
                {t('organization.generateDescription')}
              </button>
            </div>
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))
              }
              rows={3}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={busy || !draft.name.trim()}
              onClick={() => void handleSave()}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg disabled:opacity-60"
            >
              {draft.id ? t('common.save') : t('organization.namespacesAdmin.create')}
            </button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState compact title={t('organization.namespacesAdmin.empty')} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="min-w-full text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{t('organization.namespacesAdmin.name')}</th>
                <th className="px-4 py-3">{t('organization.namespacesAdmin.slug')}</th>
                <th className="px-4 py-3">{t('organization.namespacesAdmin.description')}</th>
                <th className="px-4 py-3">{t('namespaces.tabs.workspace')}</th>
                <th className="px-4 py-3">{t('namespaces.tabs.entities')}</th>
                {canWrite ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((ns) => (
                <tr
                  key={ns.id}
                  onClick={onOpenNamespace ? () => onOpenNamespace(ns) : undefined}
                  className={`border-b border-line-subtle last:border-0 ${
                    onOpenNamespace ? 'cursor-pointer hover:bg-surface-muted' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-ink">{ns.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{ns.slug}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted">
                    {ns.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted">{ns.workspace_count}</td>
                  <td className="px-4 py-3 text-muted">{ns.entity_count}</td>
                  {canWrite ? (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(ns)}
                          className="inline-flex items-center gap-1 text-muted hover:text-ink"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteNamespace(ns.id).then(load);
                          }}
                          className="inline-flex items-center gap-1 text-danger hover:text-danger"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          {t('organization.namespacesAdmin.delete')}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
