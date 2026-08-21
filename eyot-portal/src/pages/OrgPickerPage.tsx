import { AlertCircle, Building2, LoaderCircle, Plus, UserRound } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import EmptyState from '@/components/EmptyState';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { createOrganization, fetchOrganizations } from '@/lib/api/organizations';
import { resolveError } from '@/lib/apiError';
import { toSlug } from '@/lib/slug';
import type { Organization } from '@/lib/types';
import { useSessionStore } from '@/stores/session';

const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

export default function OrgPickerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);
  const setCurrentOrg = useSessionStore((state) => state.setCurrentOrg);

  const [orgs, setOrgs] = useState<readonly Organization[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (token === null) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      // v4.3+ GET /organizations is an OffsetPage — unwrap `.items`.
      const page = await fetchOrganizations();
      if (!Array.isArray(page.items)) {
        // Runtime guard: never white-screen on a malformed list payload.
        setLoadError(t('errors.invalidResponse'));
        return;
      }
      setOrgs(page.items);
    } catch (error) {
      setLoadError(resolveError(t, error));
    } finally {
      setIsLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (token === null) {
    return <Navigate to="/login" replace />;
  }

  function openCreate() {
    setShowCreate(true);
    setCreateError(null);
  }

  function handleSelect(orgId: string) {
    setCurrentOrg(orgId);
    navigate(`/orgs/${orgId}`);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (trimmedName.length === 0) {
      setCreateError(t('orgPicker.nameRequired'));
      return;
    }
    if (!SLUG_PATTERN.test(trimmedSlug)) {
      setCreateError(t('orgPicker.slugPattern'));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createOrganization({
        name: trimmedName,
        slug: trimmedSlug,
        description: description.trim().length > 0 ? description.trim() : null,
      });
      // H1: self-created org auto-selects and lands on its Dashboard — never
      // bounce back through the picker.
      setCurrentOrg(created.id);
      navigate(`/orgs/${created.id}`, { replace: true });
    } catch (error) {
      setCreateError(resolveError(t, error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-brand-fg">
              <Building2 className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">{t('common.appName')}</p>
              <p className="text-xs text-muted">{t('common.appTagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle variant="surface" />
            <LanguageSwitcher variant="surface" placement="down" />
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t('orgPicker.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-subtle">{t('orgPicker.subtitle')}</p>
        </div>

        {loadError !== null ? (
          <div
            role="alert"
            className="mb-5 flex gap-3 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="flex-1">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-md px-2 py-0.5 text-xs font-semibold text-danger hover:bg-red-900/60"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-subtle">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            {t('orgPicker.loading')}
          </div>
        ) : orgs === null ? null : orgs.length === 0 ? (
          <EmptyState
            tone="earth"
            icon={UserRound}
            title={t('orgPicker.emptyTitle')}
            description={t('orgPicker.emptyDetail')}
            action={
              <button
                type="button"
                onClick={openCreate}
                data-testid="org-picker-empty-cta"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
              >
                <Plus className="size-4" aria-hidden="true" />
                {t('orgPicker.ctaCreate')}
              </button>
            }
          />
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-nav-ink">{t('orgPicker.listTitle')}</h2>
              <button
                type="button"
                onClick={openCreate}
                data-testid="org-picker-create"
                className="inline-flex items-center gap-1.5 rounded-lg border border-nav-line px-3 py-1.5 text-xs font-semibold text-nav-ink transition-colors hover:bg-surface-muted"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {t('orgPicker.ctaCreate')}
              </button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {orgs.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(org.id)}
                    data-testid={`org-card-${org.slug}`}
                    className="w-full rounded-xl border border-nav-line bg-overlay p-4 text-left transition-colors hover:border-brand/60 hover:bg-surface"
                  >
                    <p className="truncate text-sm font-semibold text-nav-ink">{org.name}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted">{org.slug}</p>
                    {org.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-subtle">
                        {org.description}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showCreate ? (
          <form
            onSubmit={(event) => void handleCreate(event)}
            className="mt-6 space-y-4 rounded-xl border border-nav-line bg-overlay p-5"
          >
            <h2 className="text-sm font-semibold text-nav-ink">{t('orgPicker.createTitle')}</h2>
            <div>
              <label htmlFor="org-name" className="mb-1.5 block text-sm font-medium text-nav-muted">
                {t('orgPicker.name')}
              </label>
              <input
                id="org-name"
                value={name}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setName(value);
                  if (!slugTouched) {
                    setSlug(toSlug(value));
                  }
                }}
                required
                className="w-full rounded-lg border border-nav-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label htmlFor="org-slug" className="mb-1.5 block text-sm font-medium text-nav-muted">
                {t('orgPicker.slug')}
              </label>
              <input
                id="org-slug"
                value={slug}
                onChange={(event) => {
                  setSlug(event.currentTarget.value);
                  setSlugTouched(true);
                }}
                placeholder="kebab-case"
                required
                className="w-full rounded-lg border border-nav-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label
                htmlFor="org-description"
                className="mb-1.5 block text-sm font-medium text-nav-muted"
              >
                {t('orgPicker.description')}
              </label>
              <textarea
                id="org-description"
                value={description}
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={2}
                className="w-full rounded-lg border border-nav-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </div>
            {createError !== null ? (
              <p role="alert" className="flex items-center gap-2 text-sm text-danger">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                {createError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-nav-line px-3 py-2 text-sm font-medium text-nav-muted hover:bg-surface-muted"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={creating}
                aria-busy={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60"
              >
                {creating ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="size-4" aria-hidden="true" />
                )}
                {t('orgPicker.submitCreate')}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}
