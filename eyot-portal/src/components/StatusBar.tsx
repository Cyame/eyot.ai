import { BadgeCheck, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMe } from '@/lib/api/auth';
import { permissionLabel } from '@/lib/permissionAtoms';
import type { OrgIdentity } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';

/**
 * Displays the tenant 智人基因 (display_label) derived from GET /auth/me.
 * Expanding lists the underlying 权限. Read-only; not an authorization source.
 */
export default function StatusBar() {
  const { t } = useTranslation();
  const currentOrgId = useSessionStore((state) => state.currentOrgId);
  const [orgIdentity, setOrgIdentity] = useState<OrgIdentity | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (currentOrgId === null) {
      setOrgIdentity(null);
      return;
    }
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setOrgIdentity(me.org_identity ?? null);
      })
      .catch(() => {
        if (!cancelled) setOrgIdentity(null);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOrgId]);

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

  if (currentOrgId === null || orgIdentity === null) {
    return null;
  }

  const geneLabel = t(`statusBar.role.${orgIdentity.display_label}`, {
    defaultValue: orgIdentity.display_label,
  });
  const overflow = Math.max(0, orgIdentity.atoms.length - 2);
  const preview = orgIdentity.atoms.slice(0, 2);

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        data-testid="status-bar"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex max-w-xs min-w-0 items-center gap-2 rounded-full border border-line',
          'bg-surface-muted px-2.5 py-1.5 text-left hover:bg-surface',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        )}
      >
        <BadgeCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-medium uppercase tracking-wide text-muted">
            {t('statusBar.geneLabel')}
          </span>
          <span className="block truncate text-xs font-semibold text-ink" title={geneLabel}>
            {geneLabel}
          </span>
        </span>
        <span className="sr-only">{t('statusBar.permissionsLabel')}</span>
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {preview.map((atom) => (
            <span
              key={atom}
              title={permissionLabel(t, atom)}
              className="truncate rounded bg-surface px-1.5 py-0.5 text-[10px] text-ink-muted ring-1 ring-line"
            >
              {permissionLabel(t, atom)}
            </span>
          ))}
          {overflow > 0 ? (
            <span className="shrink-0 text-[10px] font-medium text-brand">+{overflow}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted transition-transform',
            open ? 'rotate-180' : '',
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="dialog"
          data-testid="status-bar-permissions"
          aria-label={t('statusBar.permissionsLabel')}
          className="absolute right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-lg border border-line bg-surface py-2 shadow-lg"
        >
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
            {t('statusBar.geneLabel')} · {geneLabel}
          </p>
          <p className="px-3 pb-2 text-xs text-muted">{t('statusBar.permissionsHint')}</p>
          <ul className="max-h-72 overflow-y-auto px-2">
            {orgIdentity.atoms.map((atom) => (
              <li
                key={atom}
                className="rounded px-2 py-1.5 text-sm text-ink"
                data-testid={`status-bar-permission-${atom}`}
              >
                {permissionLabel(t, atom)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
