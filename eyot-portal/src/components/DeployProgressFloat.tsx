import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw, Square, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ApiError, api } from '@/lib/api';
import { cancelDeploy, fetchDeploySnapshot, streamDeployProgress } from '@/lib/api/deploy';
import { resolveError } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { useDeployProgressStore } from '@/stores/deployProgressStore';
import { useSessionStore } from '@/stores/session';

/** Client-side deploy watch timeout (matches backend healthz window). */
export const DEPLOY_UI_TIMEOUT_MS = 300_000;

export const deployWatchConfig = {
  pollIntervalMs: 2_000,
  failThreshold: 3,
};

function parseStepNames(message: string | null): readonly string[] | null {
  if (!message) return null;
  try {
    const parsed = JSON.parse(message) as { steps?: string[] };
    if (Array.isArray(parsed.steps) && parsed.steps.every((s) => typeof s === 'string')) {
      return parsed.steps;
    }
  } catch {
    return null;
  }
  return null;
}

export default function DeployProgressFloat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useSessionStore((s) => s.token);
  const job = useDeployProgressStore((s) => s.job);
  const patch = useDeployProgressStore((s) => s.patch);
  const start = useDeployProgressStore((s) => s.start);
  const minimize = useDeployProgressStore((s) => s.minimize);
  const expand = useDeployProgressStore((s) => s.expand);
  const clear = useDeployProgressStore((s) => s.clear);
  const abortRef = useRef<AbortController | null>(null);

  const terminal = job !== null && job.phase !== 'running';

  useEffect(() => {
    if (job === null || job.phase !== 'running') return;
    const recordId = job.recordId;
    const ac = new AbortController();
    abortRef.current = ac;
    let finished = false;
    let consecutiveFailures = 0;

    const timeoutId = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      ac.abort();
      patch({ phase: 'timeout', message: t('deploy.timeout') });
    }, DEPLOY_UI_TIMEOUT_MS);

    const pollSnapshot = async () => {
      try {
        const snap = await fetchDeploySnapshot(recordId);
        if (ac.signal.aborted || finished) return false;
        consecutiveFailures = 0;
        const names = parseStepNames(snap.message);
        if (names !== null) patch({ stepNames: names });
        if (snap.status === 'success') {
          finished = true;
          patch({ phase: 'success', currentStep: 9, stepStatus: 'done' });
          return true;
        }
        if (snap.status === 'failed') {
          finished = true;
          patch({ phase: 'failed', message: snap.message });
          return true;
        }
        if (snap.status === 'cancelled') {
          finished = true;
          patch({ phase: 'cancelled' });
          return true;
        }
      } catch (error) {
        if (ac.signal.aborted || finished) return false;
        if (error instanceof ApiError && error.status === 404) {
          finished = true;
          patch({
            phase: 'record_missing',
            minimized: false,
            message: t('deploy.recordMissing'),
          });
          return true;
        }
        consecutiveFailures += 1;
        if (consecutiveFailures >= deployWatchConfig.failThreshold) {
          finished = true;
          patch({
            phase: 'connection_lost',
            minimized: false,
            message: t('deploy.connectionLost'),
          });
          return true;
        }
      }
      return false;
    };

    void (async () => {
      if (await pollSnapshot()) {
        window.clearTimeout(timeoutId);
        return;
      }
      try {
        await streamDeployProgress(
          recordId,
          token,
          (frame) => {
            if (finished || ac.signal.aborted) return;
            if (typeof frame.step === 'number') {
              patch({
                currentStep: frame.step,
                stepStatus: frame.status ?? 'running',
                message: frame.message ?? null,
              });
            }
            if (frame.status === 'failed') {
              finished = true;
              patch({ phase: 'failed', message: frame.message ?? t('deploy.failed') });
            } else if (frame.step === 9 && frame.status === 'done') {
              finished = true;
              patch({ phase: 'success', currentStep: 9, stepStatus: 'done' });
            }
          },
          ac.signal,
        );
      } catch {
        if (!finished && !ac.signal.aborted) {
          const interval = window.setInterval(() => {
            void pollSnapshot().then((done) => {
              if (done) window.clearInterval(interval);
            });
          }, deployWatchConfig.pollIntervalMs);
          ac.signal.addEventListener('abort', () => window.clearInterval(interval));
        }
      } finally {
        if (finished) window.clearTimeout(timeoutId);
      }
    })();

    return () => {
      window.clearTimeout(timeoutId);
      ac.abort();
    };
  }, [job?.recordId, job?.phase, patch, t, token, job]);

  const steps = useMemo(() => job?.stepNames ?? [], [job?.stepNames]);

  if (job === null) return null;

  const titleKey =
    job.phase === 'success'
      ? 'deploy.successTitle'
      : job.phase === 'cancelled'
        ? 'deploy.cancelledTitle'
        : job.phase === 'timeout'
          ? 'deploy.timeoutTitle'
          : job.phase === 'connection_lost'
            ? 'deploy.connectionLostTitle'
            : job.phase === 'record_missing'
              ? 'deploy.recordMissingTitle'
              : job.phase === 'failed'
                ? 'deploy.failedTitle'
                : 'deploy.runningTitle';

  if (job.minimized && !terminal) {
    return (
      <button
        type="button"
        onClick={expand}
        data-testid="deploy-progress-minimized"
        className="fixed bottom-4 right-4 z-[70] inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-lg hover:bg-surface-muted"
      >
        <LoaderCircle className="size-4 animate-spin text-brand" aria-hidden="true" />
        {t('deploy.runningBackground')}
      </button>
    );
  }

  const handleRetryDeploy = () => {
    void api<{ id: string; instance_id: string }>(
      `/instances/${encodeURIComponent(job.instanceId)}/deploy`,
      { method: 'POST' },
    )
      .then((record) => {
        start({
          recordId: record.id,
          instanceId: record.instance_id,
          workspaceId: job.workspaceId,
        });
      })
      .catch((error) => {
        patch({ message: resolveError(t, error, 'deploy.retryFailed') });
      });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deploy-progress-title"
      data-testid="deploy-progress-float"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-overlay p-0 sm:items-center sm:p-4"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-t-xl border border-line bg-surface shadow-2xl sm:rounded-xl">
        <header className="border-b border-line px-5 py-4">
          <h2 id="deploy-progress-title" className="text-base font-semibold text-ink">
            {t(titleKey)}
          </h2>
          <p className="mt-1 text-xs text-muted">{t('deploy.subtitle')}</p>
        </header>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto px-5 py-4">
          {steps.map((name, index) => {
            const stepNum = index + 1;
            let state: 'pending' | 'running' | 'done' | 'failed' = 'pending';
            if (job.phase === 'failed' && stepNum === job.currentStep) state = 'failed';
            else if (
              job.currentStep > stepNum ||
              (job.currentStep === stepNum && job.stepStatus === 'done')
            )
              state = 'done';
            else if (job.currentStep === stepNum && job.phase === 'running') state = 'running';
            else if (job.phase === 'success') state = 'done';

            return (
              <div
                key={name}
                className="flex items-center gap-3 rounded-lg border border-line-subtle px-3 py-2 text-sm"
                data-testid={`deploy-step-${stepNum}`}
              >
                {state === 'running' ? (
                  <LoaderCircle className="size-4 shrink-0 animate-spin text-brand" />
                ) : state === 'done' ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : state === 'failed' ? (
                  <XCircle className="size-4 shrink-0 text-danger" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-line-strong" />
                )}
                <span
                  className={cn(
                    'font-mono text-xs',
                    state === 'pending' ? 'text-muted-subtle' : 'text-ink',
                  )}
                >
                  {t(`deploy.steps.${name}`, { defaultValue: name })}
                </span>
              </div>
            );
          })}

          {job.message &&
          (job.phase === 'failed' ||
            job.phase === 'timeout' ||
            job.phase === 'connection_lost' ||
            job.phase === 'record_missing') ? (
            <div
              role="alert"
              data-testid={
                job.phase === 'connection_lost'
                  ? 'deploy-connection-lost'
                  : job.phase === 'record_missing'
                    ? 'deploy-record-missing'
                    : 'deploy-error-message'
              }
              className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="break-all">{job.message}</p>
            </div>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
          {!terminal ? (
            <>
              <button
                type="button"
                onClick={minimize}
                data-testid="deploy-run-background"
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted"
              >
                {t('deploy.runBackground')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void cancelDeploy(job.recordId)
                    .then(() => {
                      abortRef.current?.abort();
                      patch({ phase: 'cancelled' });
                    })
                    .catch(() => {
                      patch({ phase: 'failed', message: t('deploy.cancelFailed') });
                    });
                }}
                data-testid="deploy-cancel"
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger-soft px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-100"
              >
                <Square className="size-3.5" aria-hidden="true" />
                {t('deploy.cancel')}
              </button>
            </>
          ) : job.phase === 'connection_lost' ? (
            <button
              type="button"
              onClick={() => patch({ phase: 'running' })}
              data-testid="deploy-retry-connection"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {t('deploy.retryConnection')}
            </button>
          ) : job.phase === 'record_missing' ? (
            <button
              type="button"
              onClick={() => clear()}
              data-testid="deploy-close"
              className="rounded-lg border border-line bg-surface px-4 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted"
            >
              {t('deploy.close')}
            </button>
          ) : (
            <>
              {job.phase === 'failed' || job.phase === 'timeout' ? (
                <button
                  type="button"
                  onClick={handleRetryDeploy}
                  data-testid="deploy-retry"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  {t('deploy.retryDeploy')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const workspaceId = job.workspaceId;
                  clear();
                  navigate(`/workspaces/${encodeURIComponent(workspaceId)}`);
                }}
                data-testid="deploy-start-using"
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
              >
                {t('deploy.startUsing')}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
