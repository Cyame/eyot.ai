import { LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import ComposerPanel from '@/components/ComposerPanel';
import GlobalModals from '@/components/GlobalModals';
import { useSessionStore } from '@/stores/session';

type IdeShellProps = {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly healthLabel: string;
  readonly modeLabel: string;
  readonly children: React.ReactNode;
};

/**
 * Lean workspace layout: the main canvas/content on the left and the unified
 * Composer on the right. Navigation lives in AppShell's left sidebar (the
 * workspace canvas section), so this shell renders no redundant nav chrome —
 * only a thin status footer at the bottom.
 */
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
  const clearToken = useSessionStore((state) => state.clearToken);

  if (token === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>

        <aside
          className="hidden w-[360px] shrink-0 border-l border-line bg-surface lg:flex lg:flex-col"
          aria-label={t('composer.title')}
        >
          <ComposerPanel workspaceId={workspaceId} compact />
        </aside>
      </div>

      <footer className="flex h-6 shrink-0 items-center justify-between border-t border-line bg-surface-muted px-3 text-xs text-muted">
        <span className="truncate">
          {workspaceName} · {healthLabel} · {modeLabel}
        </span>
        <span className="flex items-center gap-2 truncate text-ink">
          <User className="size-3" aria-hidden="true" />
          {user?.nickname?.trim() ||
            user?.username ||
            user?.user_id ||
            t('common.authenticatedUser')}
          <button
            type="button"
            onClick={clearToken}
            className="ml-2 inline-flex size-5 items-center justify-center rounded hover:bg-surface-muted"
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
