import {
  AlertCircle,
  ExternalLink,
  LoaderCircle,
  Power,
  Recycle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import type { AvatarDisplayStatus, EntityInstanceStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | AvatarDisplayStatus;

const STATUS_PRIORITY: Readonly<Record<AvatarDisplayStatus, number>> = {
  start_failed: 0,
  deleting: 1,
  restarting: 2,
  starting: 3,
  busy: 4,
  idle: 5,
  stopped: 6,
};

const STATUS_BADGE_CLASS: Readonly<Record<AvatarDisplayStatus, string>> = {
  busy: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  idle: 'border-amber-200 bg-amber-50 text-amber-800',
  stopped: 'border-line bg-surface-muted text-ink',
  starting: 'border-brand/30 bg-brand-soft text-brand',
  restarting: 'border-orange-200 bg-orange-50 text-orange-800',
  deleting: 'border-line bg-surface-muted text-muted',
  start_failed: 'border-danger/30 bg-danger-soft text-red-800',
};

const FILTER_OPTIONS: readonly AvatarDisplayStatus[] = [
  'busy',
  'idle',
  'stopped',
  'starting',
  'restarting',
  'deleting',
];

type InstancesTabProps = {
  readonly instances: readonly EntityInstanceStatus[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly onPromote: (instance: EntityInstanceStatus) => void;
  readonly onReap: (instance: EntityInstanceStatus) => void;
  readonly onDelete: (instance: EntityInstanceStatus) => void;
  readonly onStop: (instance: EntityInstanceStatus) => void;
  readonly onRestart: (instance: EntityInstanceStatus) => void;
  readonly onGoWorkspace: (instance: EntityInstanceStatus) => void;
};

export default function InstancesTab({
  instances,
  isLoading,
  errorMessage,
  onPromote,
  onReap,
  onDelete,
  onStop,
  onRestart,
  onGoWorkspace,
}: InstancesTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [onlyBusy, setOnlyBusy] = useState(false);
  const [onlyIdle, setOnlyIdle] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instances
      .filter((inst) => {
        if (onlyBusy && inst.display_status !== 'busy') return false;
        if (onlyIdle && inst.display_status !== 'idle') return false;
        if (statusFilter !== 'all' && inst.display_status !== statusFilter) return false;
        if (q === '') return true;
        return (
          inst.id.toLowerCase().includes(q) ||
          inst.display_status.includes(q) ||
          inst.status.toLowerCase().includes(q)
        );
      })
      .slice()
      .sort((a, b) => {
        const pa = STATUS_PRIORITY[a.display_status] ?? 99;
        const pb = STATUS_PRIORITY[b.display_status] ?? 99;
        if (pa !== pb) return pa - pb;
        return b.spawn_time.localeCompare(a.spawn_time);
      });
  }, [instances, query, onlyBusy, onlyIdle, statusFilter]);

  const counters = useMemo(() => {
    const counts = { busy: 0, idle: 0, stopped: 0 };
    for (const inst of instances) {
      if (inst.display_status === 'busy') counts.busy += 1;
      else if (inst.display_status === 'idle') counts.idle += 1;
      else if (inst.display_status === 'stopped') counts.stopped += 1;
    }
    return counts;
  }, [instances]);

  const totalInstances = instances.length;
  const unhealthyCount = instances.filter((inst) => inst.status !== 'running').length;
  const healthKind: 'healthy' | 'degraded' = unhealthyCount > 0 ? 'degraded' : 'healthy';

  return (
    <section aria-labelledby="instances-tab-heading" className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="instances-tab-heading" className="text-sm font-semibold text-ink">
          {t('entityModal.tabs.instances')}
        </h2>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            healthKind === 'healthy'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800',
          )}
          data-testid="instances-health"
        >
          {t(
            healthKind === 'healthy'
              ? 'entityModal.instancesTab.healthHealthy'
              : 'entityModal.instancesTab.healthDegraded',
          )}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CounterCard label={t('entityModal.instancesTab.total')} value={totalInstances} />
        <CounterCard label={t('entityModal.instancesTab.busy')} value={counters.busy} />
        <CounterCard label={t('entityModal.instancesTab.idle')} value={counters.idle} />
        <CounterCard label={t('entityModal.instancesTab.stopped')} value={counters.stopped} />
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-1.5">
          <Search className="size-4 shrink-0 text-muted-subtle" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('entityModal.instancesTab.searchPlaceholder')}
            data-testid="instances-search"
            className="w-48 bg-transparent text-sm text-ink placeholder:text-muted-subtle focus:outline-none"
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={onlyBusy}
            onChange={(e) => setOnlyBusy(e.target.checked)}
            data-testid="instances-only-busy"
            className="size-4 accent-emerald-600"
          />
          {t('entityModal.instancesTab.onlyBusy')}
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={onlyIdle}
            onChange={(e) => setOnlyIdle(e.target.checked)}
            data-testid="instances-only-idle"
            className="size-4 accent-amber-600"
          />
          {t('entityModal.instancesTab.onlyIdle')}
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-ink">
          <span className="font-semibold uppercase tracking-wide text-muted">
            {t('entityModal.instancesTab.filterByStatus')}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            data-testid="instances-status-filter"
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <option value="all">{t('entityModal.instancesTab.allStatuses')}</option>
            {FILTER_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`instance.displayStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage !== null ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-red-800"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong p-6 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {t('entityModal.instancesTab.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('entityModal.instancesTab.emptyTitle')}
          description={t('entityModal.instancesTab.emptyDetail')}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <table className="min-w-full divide-y divide-line text-sm" data-testid="instances-table">
            <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">{t('entityModal.instancesTab.columnId')}</th>
                <th className="px-3 py-2">{t('entityModal.instancesTab.columnStatus')}</th>
                <th className="px-3 py-2">{t('entityModal.instancesTab.columnHealth')}</th>
                <th className="px-3 py-2">{t('entityModal.instancesTab.columnSpawn')}</th>
                <th className="px-3 py-2">{t('entityModal.instancesTab.columnActive')}</th>
                <th className="px-3 py-2 text-right">
                  {t('entityModal.instancesTab.columnActions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {filtered.map((inst) => (
                <InstanceRow
                  key={inst.id}
                  instance={inst}
                  onPromote={onPromote}
                  onReap={onReap}
                  onDelete={onDelete}
                  onStop={onStop}
                  onRestart={onRestart}
                  onGoWorkspace={onGoWorkspace}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CounterCard({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function InstanceRow({
  instance,
  onPromote,
  onReap,
  onDelete,
  onStop,
  onRestart,
  onGoWorkspace,
}: {
  readonly instance: EntityInstanceStatus;
  readonly onPromote: (inst: EntityInstanceStatus) => void;
  readonly onReap: (inst: EntityInstanceStatus) => void;
  readonly onDelete: (inst: EntityInstanceStatus) => void;
  readonly onStop: (inst: EntityInstanceStatus) => void;
  readonly onRestart: (inst: EntityInstanceStatus) => void;
  readonly onGoWorkspace: (inst: EntityInstanceStatus) => void;
}) {
  const { t } = useTranslation();
  const shortId = instance.id.slice(0, 8);
  const isRunning = instance.status === 'running';
  const isHealthy = isRunning;
  const canGoWorkspace = Boolean(instance.workspace_id);
  const canStop = isRunning;
  return (
    <tr data-testid={`instance-row-${instance.id}`}>
      <td className="px-3 py-2 font-mono text-xs text-ink" title={instance.id}>
        {shortId}
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
            STATUS_BADGE_CLASS[instance.display_status],
          )}
        >
          {t(`instance.displayStatus.${instance.display_status}`)}
        </span>
      </td>
      <td className="px-3 py-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
            isHealthy
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-line bg-surface-muted text-muted',
          )}
          title={t('entityModal.instancesTab.healthHint')}
        >
          {isHealthy
            ? t('entityModal.instancesTab.healthOk')
            : t('entityModal.instancesTab.healthDown')}
        </span>
      </td>
      <td className="px-3 py-2 font-mono text-xs text-ink">{instance.spawn_time}</td>
      <td className="px-3 py-2 font-mono text-xs text-ink">{instance.last_active_at ?? '—'}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onPromote(instance)}
            className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title={t('promoteModal.open')}
            data-testid="instance-promote"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onGoWorkspace(instance)}
            disabled={!canGoWorkspace}
            className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-brand transition-colors hover:border-brand/30 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
            title={
              canGoWorkspace
                ? t('entityModal.instancesTab.goToWorkspace')
                : t('entityModal.instancesTab.goToWorkspaceMissing')
            }
            data-testid="instance-go-workspace"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onStop(instance)}
            disabled={!canStop}
            data-testid="instance-stop"
            className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-ink transition-colors hover:border-line hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
            title={t('entityModal.instancesTab.stop')}
          >
            <Power className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRestart(instance)}
            data-testid="instance-restart"
            className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:border-amber-200 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            title={t('entityModal.instancesTab.restart')}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onReap(instance)}
            data-testid="instance-reap"
            className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title={t('entityModal.instancesTab.reap')}
          >
            <Recycle className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(instance)}
            data-testid="instance-delete"
            className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-danger transition-colors hover:border-danger/30 hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            title={t('entityModal.instancesTab.delete')}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}
