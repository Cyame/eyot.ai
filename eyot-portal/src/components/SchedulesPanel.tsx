import { AlertCircle, CalendarClock, LoaderCircle, Pencil, Plus, Trash } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  updateSchedule,
} from '@/lib/api/schedules';
import { resolveError } from '@/lib/apiError';
import type { BrainstemSchedule, JsonObject } from '@/lib/types';

const CRON_FIELD_COUNT = 5;

function isFiveFieldCron(expr: string): boolean {
  return expr.trim().split(/\s+/).length === CRON_FIELD_COUNT;
}

function parsePayload(text: string): JsonObject | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const parsed: unknown = JSON.parse(trimmed);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('payload must be a JSON object');
  }
  return parsed as JsonObject;
}

type ScheduleFormProps = {
  readonly workspaceId: string;
  readonly editing: BrainstemSchedule | null;
  readonly onDone: (messageKey: string) => void;
  readonly onFailed: (message: string) => void;
};

function ScheduleForm({ workspaceId, editing, onDone, onFailed }: ScheduleFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(editing?.name ?? '');
  const [cronExpr, setCronExpr] = useState(editing?.cron_expr ?? '');
  const [payloadText, setPayloadText] = useState(
    editing?.action_payload !== null && editing?.action_payload !== undefined
      ? JSON.stringify(editing.action_payload, null, 2)
      : '',
  );
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedCron = cronExpr.trim();
    if (trimmedName.length === 0) {
      setFormError(t('schedules.nameRequired'));
      return;
    }
    if (!isFiveFieldCron(trimmedCron)) {
      setFormError(t('schedules.cronInvalid'));
      return;
    }
    let actionPayload: JsonObject | null;
    try {
      actionPayload = parsePayload(payloadText);
    } catch {
      setFormError(t('schedules.payloadInvalid'));
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      if (editing !== null) {
        await updateSchedule(workspaceId, editing.id, {
          name: trimmedName,
          cron_expr: trimmedCron,
          action_payload: actionPayload,
          enabled,
        });
        onDone('schedules.saved');
      } else {
        await createSchedule(workspaceId, {
          name: trimmedName,
          cron_expr: trimmedCron,
          action_payload: actionPayload,
          enabled,
        });
        onDone('schedules.created');
      }
    } catch (error) {
      onFailed(resolveError(t, error, 'schedules.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {t('schedules.fieldName')}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('schedules.namePlaceholder')}
            disabled={submitting}
            className="mt-1.5 w-full rounded-lg border border-line-strong px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          {t('schedules.fieldCron')}
          <input
            value={cronExpr}
            onChange={(event) => setCronExpr(event.target.value)}
            placeholder={t('schedules.cronPlaceholder')}
            disabled={submitting}
            className="mt-1.5 w-full rounded-lg border border-line-strong px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
        {t('schedules.fieldPayload')}
        <textarea
          value={payloadText}
          onChange={(event) => setPayloadText(event.target.value)}
          placeholder={t('schedules.payloadPlaceholder')}
          disabled={submitting}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-line-strong px-3 py-2 font-mono text-xs"
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          disabled={submitting}
          className="size-3.5 rounded border-line-strong text-brand"
        />
        {t('schedules.fieldEnabled')}
      </label>
      {formError !== null ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {editing !== null ? t('schedules.save') : t('schedules.create')}
        </button>
        <button
          type="button"
          onClick={() => {
            setName('');
            setCronExpr('');
            setPayloadText('');
            setEnabled(true);
            setFormError(null);
            onDone('');
          }}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted disabled:opacity-60"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function formatRunAt(value: string | null, fallback: string): string {
  if (value === null) return fallback;
  return new Date(value).toLocaleString();
}

export default function SchedulesPanel({ workspaceId }: { readonly workspaceId: string }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<readonly BrainstemSchedule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BrainstemSchedule | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchSchedules(workspaceId);
      setItems(page.items);
      setTotal(page.total);
    } catch (err) {
      setError(resolveError(t, err));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFormDone = useCallback(
    (messageKey: string) => {
      setFormOpen(false);
      setEditing(null);
      setFeedback(messageKey.length > 0 ? t(messageKey) : null);
      void load();
    },
    [load, t],
  );

  const handleFormFailed = useCallback((message: string) => {
    setError(message);
  }, []);

  const handleDelete = useCallback(
    async (schedule: BrainstemSchedule) => {
      const ok = window.confirm(t('schedules.deleteConfirm', { name: schedule.name }));
      if (!ok) return;
      setBusyId(schedule.id);
      setError(null);
      try {
        await deleteSchedule(workspaceId, schedule.id);
        setEditing(null);
        setFormOpen(false);
        void load();
      } catch (err) {
        setError(resolveError(t, err, 'schedules.failed'));
      } finally {
        setBusyId(null);
      }
    },
    [load, t, workspaceId],
  );

  const handleToggleEnabled = useCallback(
    async (schedule: BrainstemSchedule) => {
      setBusyId(schedule.id);
      setError(null);
      try {
        await updateSchedule(workspaceId, schedule.id, { enabled: !schedule.enabled });
        void load();
      } catch (err) {
        setError(resolveError(t, err, 'schedules.failed'));
      } finally {
        setBusyId(null);
      }
    },
    [load, t, workspaceId],
  );

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">{t('schedules.title')}</h2>
          {!formOpen ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-brand-fg hover:bg-brand-hover"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {t('schedules.createTitle')}
            </button>
          ) : null}
        </div>

        {formOpen ? (
          <ScheduleForm
            workspaceId={workspaceId}
            editing={editing}
            onDone={handleFormDone}
            onFailed={handleFormFailed}
          />
        ) : null}

        {feedback !== null ? (
          <p
            role="status"
            className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
          >
            {feedback}
          </p>
        ) : null}

        {error !== null ? (
          <p
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {t('common.loading')}
          </p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('schedules.empty')}</p>
        ) : (
          <>
            <ul className="mt-3 space-y-2">
              {items.map((schedule) => (
                <li
                  key={schedule.id}
                  className="rounded-md border border-line-subtle bg-surface-muted px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-mono text-xs font-semibold text-ink">
                          {schedule.name}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-xs">
                          <span
                            aria-hidden="true"
                            className={`size-1.5 rounded-full ${schedule.enabled ? 'bg-success' : 'bg-muted-subtle'}`}
                          />
                          {schedule.enabled ? t('schedules.enabled') : t('schedules.disabled')}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-xs text-muted">
                        <span>{schedule.cron_expr}</span>
                        <span className="flex items-center gap-1">
                          <CalendarClock className="size-3.5" aria-hidden="true" />
                          {t('schedules.lastRunAt')}:{' '}
                          {formatRunAt(schedule.last_run_at, t('schedules.never'))}
                        </span>
                        <span className="flex items-center gap-1">
                          {t('schedules.nextRunAt')}:{' '}
                          {formatRunAt(schedule.next_run_at, t('schedules.never'))}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleToggleEnabled(schedule)}
                        disabled={busyId !== null}
                        aria-label={t('schedules.fieldEnabled')}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1 text-xs font-medium text-ink hover:bg-surface-muted disabled:opacity-60"
                      >
                        <span
                          aria-hidden="true"
                          className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                            schedule.enabled ? 'bg-success' : 'bg-surface-muted'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`inline-block size-3 transform rounded-full bg-surface transition-transform ${
                              schedule.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`}
                          />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(schedule);
                          setFormOpen(true);
                          setFeedback(null);
                        }}
                        disabled={busyId !== null}
                        aria-label={t('schedules.edit')}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-surface-muted disabled:opacity-60"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(schedule)}
                        disabled={busyId !== null}
                        aria-label={t('schedules.delete')}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
                      >
                        <Trash className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-subtle">{t('schedules.count', { total })}</p>
          </>
        )}
      </article>
    </div>
  );
}
