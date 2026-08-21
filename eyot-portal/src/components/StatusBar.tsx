import { BadgeCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMe } from '@/lib/api/auth';
import type { OrgIdentity } from '@/lib/types';
import { useSessionStore } from '@/stores/session';

/**
 * Displays the tenant identity derived from GET /auth/me with the active
 * X-Organization-Id header — display_label + atom chips. Read-only; not an
 * authorization source (v4.3 B4/H7).
 */
export default function StatusBar() {
  const { t } = useTranslation();
  const currentOrgId = useSessionStore((state) => state.currentOrgId);
  const [orgIdentity, setOrgIdentity] = useState<OrgIdentity | null>(null);

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

  if (currentOrgId === null || orgIdentity === null) {
    return null;
  }

  const roleLabel = t(`statusBar.role.${orgIdentity.display_label}`, {
    defaultValue: orgIdentity.display_label,
  });

  return (
    <div
      data-testid="status-bar"
      className="hidden min-w-0 max-w-xs items-center gap-2 rounded-full border border-line bg-surface-muted px-2.5 py-1.5 lg:flex"
    >
      <BadgeCheck className="size-3.5 shrink-0 text-success" aria-hidden="true" />
      <span className="shrink-0 truncate text-xs font-semibold text-ink" title={roleLabel}>
        {roleLabel}
      </span>
      <span className="sr-only">{t('statusBar.atomsLabel')}</span>
      <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {orgIdentity.atoms.slice(0, 3).map((atom) => (
          <span
            key={atom}
            title={atom}
            className="truncate rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted ring-1 ring-line"
          >
            {atom}
          </span>
        ))}
        {orgIdentity.atoms.length > 3 ? (
          <span className="shrink-0 font-mono text-[10px] text-muted-subtle">
            +{orgIdentity.atoms.length - 3}
          </span>
        ) : null}
      </span>
    </div>
  );
}
