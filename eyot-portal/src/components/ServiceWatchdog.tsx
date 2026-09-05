import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/api';
import { type DependencyStatus, fetchSystemDependencies } from '@/lib/api/system';
import { useSessionStore } from '@/stores/session';

export const watchdogConfig = {
  healthyIntervalMs: 15_000,
  maxBackoffMs: 60_000,
};

function nextBackoffMs(failStreak: number): number {
  if (failStreak <= 0) return watchdogConfig.healthyIntervalMs;
  if (failStreak === 1) return 30_000;
  return watchdogConfig.maxBackoffMs;
}

function failedDependencies(
  snapshotOk: boolean,
  items: readonly DependencyStatus[],
): readonly DependencyStatus[] {
  const failed = items.filter((item) => !item.ok);
  if (failed.length > 0) return failed;
  if (!snapshotOk) return [{ name: 'backend', ok: false, detail: null }];
  return [];
}

export default function ServiceWatchdog() {
  const { t } = useTranslation();
  const token = useSessionStore((state) => state.token);
  const [failed, setFailed] = useState<readonly DependencyStatus[]>([]);
  const timerRef = useRef<number | null>(null);
  const failStreakRef = useRef(0);
  const cancelledRef = useRef(false);
  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (token === null) {
      setFailed([]);
      return;
    }
    cancelledRef.current = false;
    failStreakRef.current = 0;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const tick = () => {
      void (async () => {
        try {
          const snapshot = await fetchSystemDependencies();
          if (cancelledRef.current) return;
          const nextFailed = failedDependencies(snapshot.ok, snapshot.dependencies);
          setFailed(nextFailed);
          if (nextFailed.length === 0) {
            failStreakRef.current = 0;
          } else {
            failStreakRef.current += 1;
          }
          clearTimer();
          timerRef.current = window.setTimeout(tick, nextBackoffMs(failStreakRef.current));
        } catch (error) {
          if (cancelledRef.current) return;
          if (error instanceof ApiError && error.status === 401) {
            setFailed([]);
            return;
          }
          failStreakRef.current += 1;
          setFailed([{ name: 'backend', ok: false, detail: null }]);
          clearTimer();
          timerRef.current = window.setTimeout(tick, nextBackoffMs(failStreakRef.current));
        }
      })();
    };

    tickRef.current = () => {
      failStreakRef.current = 0;
      clearTimer();
      tick();
    };
    tick();
    return () => {
      cancelledRef.current = true;
      clearTimer();
    };
  }, [token]);

  if (token === null || failed.length === 0) return null;

  return (
    <div
      role="alert"
      data-testid="service-watchdog-banner"
      className="fixed inset-x-0 top-0 z-[60] flex items-start justify-between gap-3 border-b border-danger/30 bg-danger-soft px-4 py-2 text-sm text-red-800 shadow-sm"
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{t('watchdog.title')}</p>
          <ul className="mt-0.5 list-disc pl-4">
            {failed.map((item) => (
              <li key={item.name} data-testid={`service-watchdog-dep-${item.name}`}>
                {t(`watchdog.dependency.${item.name}`, {
                  defaultValue: t('watchdog.unknown', { name: item.name }),
                })}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        data-testid="service-watchdog-retry"
        onClick={() => tickRef.current()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-danger/30 bg-surface px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
      >
        <RefreshCw className="size-3.5" aria-hidden="true" />
        {t('watchdog.retry')}
      </button>
    </div>
  );
}
