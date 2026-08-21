import { Bug, Building2, Layers, LogOut, Sparkles, User, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, NavLink } from 'react-router';
import ComposerPanel from '@/components/ComposerPanel';
import GlobalModals from '@/components/GlobalModals';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/stores/session';

type IdeShellProps = {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly healthLabel: string;
  readonly modeLabel: string;
  readonly children: ReactNode;
};

export default function IdeShell({
  workspaceId,
  workspaceName,
  healthLabel,
  modeLabel,
  children,
}: IdeShellProps) {
  const { t } = useTranslation();
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);
  const orgId = useSessionStore((state) => state.currentOrgId);
  const clearToken = useSessionStore((state) => state.clearToken);

  if (token === null) {
    return <Navigate to="/login" replace />;
  }

  const sidebarItems = [
    { href: '/namespaces?tab=workspace', Icon: Building2, label: t('ide.sidebar.workspaces') },
    { href: '/namespaces?tab=base-classes', Icon: Sparkles, label: t('ide.sidebar.baseClasses') },
    { href: '/namespaces?tab=contracts', Icon: Users, label: t('ide.sidebar.contracts') },
    { href: '/namespaces?tab=entities', Icon: Layers, label: t('ide.sidebar.entities') },
    {
      href:
        orgId !== null
          ? `/orgs/${encodeURIComponent(orgId)}/capabilities`
          : '/namespaces?tab=capability-market',
      Icon: Sparkles,
      label: t('ide.sidebar.capabilityMarket'),
    },
    { href: '/namespaces?tab=debug', Icon: Bug, label: t('ide.sidebar.debug') },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <div className="flex min-h-0 flex-1">
        <aside className="nav-shell hidden w-14 shrink-0 flex-col items-center gap-2 border-r border-nav-line py-3 md:flex">
          {sidebarItems.map(({ href, Icon, label }) => (
            <NavLink
              key={href}
              to={href}
              title={label}
              className={({ isActive }) =>
                cn(
                  'grid size-10 place-items-center rounded-xl transition-colors',
                  isActive
                    ? 'bg-brand text-brand-fg shadow-sm'
                    : 'text-nav-muted hover:bg-nav-hover hover:text-nav-ink',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </NavLink>
          ))}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-line bg-surface/80 px-4 backdrop-blur-md">
            <Link
              to="/namespaces?tab=workspace"
              className="text-sm font-medium text-muted hover:text-ink"
            >
              {t('ide.backToNamespaces')}
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="surface" />
              <LanguageSwitcher variant="surface" placement="down" />
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 overflow-hidden">{children}</main>

            <aside
              className="hidden w-[360px] shrink-0 border-l border-line bg-surface lg:flex lg:flex-col"
              aria-label={t('composer.title')}
            >
              <ComposerPanel workspaceId={workspaceId} compact />
            </aside>
          </div>
        </div>
      </div>

      <footer className="flex h-6 shrink-0 items-center justify-between border-t border-nav-line bg-nav px-3 text-xs text-nav-muted">
        <span className="truncate">
          {workspaceName} · {healthLabel} · {modeLabel}
        </span>
        <span className="flex items-center gap-2 truncate text-nav-ink">
          <User className="size-3" aria-hidden="true" />
          {user?.nickname?.trim() ||
            user?.username ||
            user?.user_id ||
            t('common.authenticatedUser')}
          <button
            type="button"
            onClick={clearToken}
            className="ml-2 inline-flex size-5 items-center justify-center rounded hover:bg-nav-hover"
            aria-label={t('common.logOut')}
          >
            <LogOut className="size-3" aria-hidden="true" />
          </button>
        </span>
      </footer>

      <GlobalModals />
    </div>
  );
}
