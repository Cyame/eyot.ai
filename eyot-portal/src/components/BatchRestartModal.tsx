import { AlertTriangle, ArrowDownUp, CheckCircle2, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api';
import { resolveError } from '@/lib/apiError';
import type { LoopStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single instance surfaced in the batch-restart modal.
 *
 * ``outdated_for_iso`` is a timestamp used to compute the relative
 * duration shown next to each row (the backend doesn't expose a dedicated
 * "outdated_since" field, so we use the instance's last-updated time as a
 * proxy — the longer an instance hasn't been touched, the longer it has
 * been running on a stale hash).
 */
export type OutdatedInstanceRow = {
  readonly instance_id: string;
  readonly employee_id: string;
  readonly employee_label: string;
  readonly loop_status: LoopStatus | 'unknown';
  readonly active_hash: string | null;
  readonly outdated_for_iso: string;
  readonly is_running: boolean;
};

export type BatchRestartModalProps = {
  readonly isOpen: boolean;
  readonly outdatedInstances: readonly OutdatedInstanceRow[];
  /** Total number of instances in the workspace (used in the subtitle). */
  readonly totalInstanceCount: number;
  readonly onClose: () => void;
  /**
   * Called when the operator confirms the restart. Resolves with
   * ``true`` on success and ``false`` on failure (the modal surfaces a
   * red banner). On success the modal stays open until the operator
   * dismisses it, so the parent can keep its loading state clean.
   */
  readonly onConfirm: (selectedIds: readonly string[]) => Promise<boolean>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_BADGE: Readonly<
  Record<LoopStatus | 'unknown', { readonly labelKey: string; readonly className: string }>
> = {
  running: {
    labelKey: 'instance.loopStatus.running',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  idle: {
    labelKey: 'instance.loopStatus.idle',
    className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  paused: {
    labelKey: 'instance.loopStatus.paused',
    className: 'bg-surface-muted text-ink border-line',
  },
  interrupted: {
    labelKey: 'instance.loopStatus.interrupted',
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  completed: {
    labelKey: 'instance.loopStatus.completed',
    className: 'bg-brand-soft text-brand border-brand/30',
  },
  failed: {
    labelKey: 'instance.loopStatus.failed',
    className: 'bg-danger-soft text-danger border-danger/30',
  },
  unknown: {
    labelKey: 'batchRestart.outdatedLabel',
    className: 'bg-surface-muted text-muted border-line',
  },
};

function formatDuration(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '-';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return '0s';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function shortHash(hash: string | null): string {
  if (hash === null || hash.length < 8) return hash ?? '-';
  return hash.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BatchRestartModal({
  isOpen,
  outdatedInstances,
  totalInstanceCount,
  onClose,
  onConfirm,
}: BatchRestartModalProps): ReactElement | null {
  const { t } = useTranslation();

  // Sort by outdated duration descending — oldest first (PRD §8.U.4).
  const sortedInstances = useMemo<readonly OutdatedInstanceRow[]>(() => {
    return [...outdatedInstances].sort((a, b) => {
      const aTime = new Date(a.outdated_for_iso).getTime();
      const bTime = new Date(b.outdated_for_iso).getTime();
      return aTime - bTime;
    });
  }, [outdatedInstances]);

  const selectableIds = useMemo<readonly string[]>(
    () => sortedInstances.filter((row) => !row.is_running).map((row) => row.instance_id),
    [sortedInstances],
  );

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [confirmStep, setConfirmStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset internal state whenever the modal re-opens or the candidate set
  // changes shape. Default: select every non-running instance.
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setConfirmStep(false);
      setIsSubmitting(false);
      setErrorMessage(null);
      return;
    }
    setSelectedIds(new Set(selectableIds));
    setConfirmStep(false);
    setIsSubmitting(false);
    setErrorMessage(null);
  }, [isOpen, selectableIds]);

  // Close on Escape key — only when not in the middle of a submit.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (isSubmitting) return;
      onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isSubmitting, onClose]);

  const toggleRow = useCallback((instanceId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(selectableIds));
  }, [selectableIds]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleConfirm = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const ok = await onConfirm(Array.from(selectedIds));
      if (ok) {
        setConfirmStep(false);
        // Caller's onConfirm success closes the modal upstream; still,
        // reset the local confirmation step in case they keep it open.
      } else {
        setErrorMessage(t('batchRestart.errorGeneric'));
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrorMessage(t('batchRestart.runningConflict'));
      } else {
        setErrorMessage(resolveError(t, error, 'batchRestart.errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm, selectedIds, t]);

  if (!isOpen) return null;

  const outdatedCount = outdatedInstances.length;
  const selectableCount = selectableIds.length;
  const allSelectableSelected = selectableCount > 0 && selectedIds.size === selectableCount;
  const subtitleKey =
    outdatedCount === 0 ? 'batchRestart.subtitleAllMatch' : 'batchRestart.subtitle';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-restart-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4"
      data-testid="batch-restart-modal"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-line bg-surface shadow-2xl sm:rounded-xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <RefreshCw className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="batch-restart-modal-title"
                className="text-base font-semibold text-ink sm:text-lg"
              >
                {t('batchRestart.title')}
              </h2>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                {t(subtitleKey, { outdated: outdatedCount, total: totalInstanceCount })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('batchRestart.close')}
            disabled={isSubmitting}
            data-testid="batch-restart-close"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {outdatedCount > 0 ? (
            <p
              className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900"
              data-testid="batch-restart-config-hint"
            >
              {t('batchRestart.configUpdatedHint')}
            </p>
          ) : null}
          {outdatedCount === 0 ? (
            <div
              className="grid place-items-center rounded-lg border border-dashed border-line bg-surface-muted px-6 py-12 text-center text-sm text-muted"
              data-testid="batch-restart-empty"
            >
              <CheckCircle2 className="mx-auto size-8 text-emerald-500" aria-hidden="true" />
              <p className="mt-3 font-medium text-ink">{t('batchRestart.empty')}</p>
            </div>
          ) : (
            <>
              <p className="mb-3 flex items-center gap-2 text-xs text-muted">
                <ArrowDownUp className="size-3.5" aria-hidden="true" />
                {t('batchRestart.outdatedLabel')} (sorted oldest first)
              </p>
              <ul className="space-y-2" data-testid="batch-restart-list">
                {sortedInstances.map((row) => {
                  const isSelectable = !row.is_running;
                  const isChecked = selectedIds.has(row.instance_id);
                  const statusMeta = STATUS_BADGE[row.loop_status];
                  const statusLabel = t(statusMeta.labelKey);
                  const duration = formatDuration(row.outdated_for_iso);
                  const suffix = t('batchRestart.durationSuffixAgo');
                  return (
                    <li
                      key={row.instance_id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 transition-colors',
                        isSelectable ? 'hover:border-line-strong' : 'bg-surface-muted opacity-70',
                      )}
                      data-testid={`batch-restart-row-${row.instance_id}`}
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 cursor-pointer accent-brand disabled:cursor-not-allowed"
                        checked={isChecked}
                        disabled={!isSelectable}
                        onChange={() => toggleRow(row.instance_id)}
                        aria-label={row.employee_label}
                        data-testid={`batch-restart-checkbox-${row.instance_id}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {row.employee_label}
                          <span className="ml-2 font-mono text-xs text-muted">
                            #{shortHash(row.active_hash)}
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 font-semibold',
                              statusMeta.className,
                            )}
                          >
                            {statusLabel}
                          </span>
                          <span className="font-mono text-muted-subtle">
                            {t('batchRestart.outdatedLabel')} {duration} {suffix}
                          </span>
                        </div>
                      </div>
                      {row.is_running ? (
                        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                          {t('batchRestart.runningLabel')}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {selectableCount < outdatedCount ? (
                <p
                  className="mt-3 flex items-start gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-muted"
                  data-testid="batch-restart-running-hint"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {t('batchRestart.runningDisabledHint')}
                </p>
              ) : null}
            </>
          )}
        </div>

        {errorMessage !== null ? (
          <div
            role="alert"
            className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-red-800 sm:mx-6"
            data-testid="batch-restart-error"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-muted px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-muted">
            <button
              type="button"
              onClick={allSelectableSelected ? clearAll : selectAll}
              disabled={isSubmitting || selectableCount === 0}
              data-testid="batch-restart-toggle-all"
              className="rounded-md border border-line bg-surface px-2.5 py-1 font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allSelectableSelected ? t('batchRestart.clearAll') : t('batchRestart.selectAll')}
            </button>
            <span className="font-mono" data-testid="batch-restart-selected-count">
              {selectedIds.size}/{selectableCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="batch-restart-cancel"
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('batchRestart.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirmStep) {
                  void handleConfirm();
                } else {
                  setConfirmStep(true);
                }
              }}
              disabled={isSubmitting || selectedIds.size === 0}
              data-testid="batch-restart-submit"
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                selectedIds.size > 0
                  ? 'bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active'
                  : 'cursor-not-allowed bg-surface-muted text-muted',
              )}
            >
              {isSubmitting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {confirmStep
                ? t('batchRestart.confirmAction')
                : t('batchRestart.confirm', { count: selectedIds.size })}
            </button>
          </div>
        </footer>

        {confirmStep ? (
          <div
            role="alertdialog"
            aria-labelledby="batch-restart-confirm-title"
            className="border-t border-amber-200 bg-amber-50 px-5 py-3 sm:px-6"
            data-testid="batch-restart-confirm-step"
          >
            <p id="batch-restart-confirm-title" className="text-sm font-semibold text-amber-900">
              {t('batchRestart.confirmStepTitle')}
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              {t('batchRestart.confirmStepMessage', { count: selectedIds.size })}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
