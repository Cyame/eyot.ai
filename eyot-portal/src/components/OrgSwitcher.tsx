import { AlertCircle, Check, ChevronDown, Globe2, LoaderCircle, LogOut } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { fetchOrganizations } from '@/lib/api/organizations';
import { resolveError } from '@/lib/apiError';
import type { Organization } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSelectedStore } from '@/stores/selected';
import { useSessionStore } from '@/stores/session';

/**
 * Minimal dirty-topology proxy for the org-switch confirm (v4.3 B5).
 * selected.ts has no persisted dirty flag — a non-null workspaceId means an
 * IDE is currently open whose local selection / interaction state would be
 * lost on an org switch. PB-2 replaces this with a real per-workspace flag.
 */
function hasDirtyTopology(): boolean {
  return useSelectedStore.getState().workspaceId !== null;
}

type OrgSwitcherProps = {
  readonly variant?: 'header' | 'sidebar';
};

export default function OrgSwitcher({ variant = 'header' }: OrgSwitcherProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentOrgId = useSessionStore((state) => state.currentOrgId);
  const setCurrentOrg = useSessionStore((state) => state.setCurrentOrg);

  const [orgs, setOrgs] = useState<readonly Organization[] | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const load = useCallback(async () => {
    if (orgs !== null) return;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchOrganizations();
      if (!Array.isArray(page.items)) {
        // Same OffsetPage contract guard as OrgPickerPage.
        setError(t('errors.invalidResponse'));
        return;
      }
      setOrgs(page.items);
    } catch (loadError) {
      setError(resolveError(t, loadError));
    } finally {
      setLoading(false);
    }
  }, [orgs, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function selectOrg(orgId: string) {
    setOpen(false);
    if (orgId === currentOrgId) return;
    if (hasDirtyTopology() && !window.confirm(t('orgPicker.switchDirtyConfirm'))) return;
    // B5: always land on the new org's Dashboard; the URL becomes the new
    // org context (X-Organization-Id follows via setCurrentOrg).
    setCurrentOrg(orgId);
    navigate(`/orgs/${orgId}`);
  }

  const current = orgs?.find((org) => org.id === currentOrgId) ?? null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('orgPicker.switcherLabel')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={listId}
        data-testid="org-switcher"
        className={cn(
          'inline-flex min-w-0 max-w-52 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          variant === 'header'
            ? 'border border-line bg-surface text-ink hover:bg-surface-muted'
            : 'w-full text-nav-ink hover:bg-nav-hover',
        )}
      >
        <Globe2 className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {current?.name ??
            (currentOrgId !== null ? currentOrgId : t('orgPicker.switcherPlaceholder'))}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 opacity-70 transition-transform',
            open ? 'rotate-180' : '',
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={listId}
          data-testid="org-switcher-menu"
          className={cn(
            'absolute z-50 mt-1.5 min-w-[13rem] max-w-72 overflow-hidden rounded-lg border py-1 shadow-lg',
            variant === 'header'
              ? 'left-0 border-line bg-surface text-ink'
              : 'left-0 border-nav-line bg-nav text-nav-ink',
          )}
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {t('orgPicker.loading')}
            </div>
          ) : error !== null ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-danger">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{error}</span>
            </div>
          ) : (orgs ?? []).length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted">{t('orgPicker.switcherEmpty')}</div>
          ) : (
            (orgs ?? []).map((org) => {
              const selected = org.id === currentOrgId;
              return (
                <button
                  key={org.id}
                  type="button"
                  data-testid={`org-switcher-option-${org.slug}`}
                  onClick={() => selectOrg(org.id)}
                  aria-current={selected ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
                    variant === 'header'
                      ? selected
                        ? 'bg-brand-soft font-medium text-brand'
                        : 'text-ink hover:bg-surface-muted'
                      : selected
                        ? 'bg-brand font-medium text-brand-fg'
                        : 'text-nav-muted hover:bg-nav-hover hover:text-nav-ink',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{org.name}</span>
                    <span className="block truncate font-mono text-[10px] opacity-60">
                      {org.slug}
                    </span>
                  </span>
                  {selected ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })
          )}
          <div
            className={cn(
              'my-1 border-t',
              variant === 'header' ? 'border-line' : 'border-nav-line',
            )}
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/orgs/picker');
            }}
            data-testid="org-switcher-back-to-picker"
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
              variant === 'header'
                ? 'text-muted hover:bg-surface-muted'
                : 'text-nav-muted hover:bg-nav-hover hover:text-nav-ink',
            )}
          >
            <LogOut className="size-3.5 shrink-0" aria-hidden="true" />
            {t('orgPicker.backToPicker')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
