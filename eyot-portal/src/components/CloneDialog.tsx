import { Copy, LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClonePayload } from '@/lib/api/clone';
import { isValidKebabSlug, toSlug } from '@/lib/slug';
import { cn } from '@/lib/utils';

type CloneDialogProps = {
  readonly open: boolean;
  readonly title: string;
  readonly confirmMessage: string;
  readonly confirmLabel: string;
  readonly busy: boolean;
  readonly onConfirm: (payload: ClonePayload) => void;
  readonly onCancel: () => void;
};

export default function CloneDialog({
  open,
  title,
  confirmMessage,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: CloneDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugDirty, setSlugDirty] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setSlug('');
      setSlugDirty(false);
    }
  }, [open]);

  // Auto-fill slug from name (pinyin kebab) only until the user manually edits slug.
  useEffect(() => {
    if (slugDirty) return;
    setSlug(toSlug(name));
  }, [name, slugDirty]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const slugInvalid = !isValidKebabSlug(slug.trim());
  const confirmDisabled = busy || slugInvalid;

  const trimmedName = name.trim();
  const trimmedSlug = slug.trim();
  const payload: ClonePayload = {
    ...(trimmedName.length > 0 ? { name: trimmedName } : {}),
    ...(trimmedSlug.length > 0 ? { slug: trimmedSlug } : {}),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clone-dialog-title"
      className="fixed inset-0 z-[60] grid place-items-center bg-overlay p-4"
      data-testid="clone-dialog"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
              <Copy className="size-5" aria-hidden="true" />
            </span>
            <h2 id="clone-dialog-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={t('clone.dialog.close')}
            data-testid="clone-dialog-close"
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-muted">{confirmMessage}</p>
          <p className="text-xs text-muted">{t('clone.instancesNotCopied')}</p>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{t('clone.dialog.nameLabel')}</span>
            <input
              type="text"
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('clone.dialog.namePlaceholder')}
              data-testid="clone-dialog-name"
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:bg-surface-muted"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{t('clone.dialog.slugLabel')}</span>
            <input
              type="text"
              value={slug}
              disabled={busy}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugDirty(true);
              }}
              placeholder={t('clone.dialog.slugPlaceholder')}
              data-testid="clone-dialog-slug"
              className={cn(
                'w-full rounded-lg border px-3 py-2 font-mono text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:bg-surface-muted',
                slugInvalid
                  ? 'border-danger/40 focus-visible:ring-red-500'
                  : 'border-line-strong focus-visible:ring-brand',
              )}
            />
            {slugInvalid ? (
              <p
                role="alert"
                className="mt-1 text-xs text-danger"
                data-testid="clone-dialog-slug-error"
              >
                {t('clone.dialog.slugInvalid')}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">{t('clone.dialog.slugHint')}</p>
            )}
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            data-testid="clone-dialog-cancel"
            className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            {t('clone.dialog.cancel')}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={() => onConfirm(payload)}
            data-testid="clone-dialog-confirm"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              'disabled:opacity-60',
            )}
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {busy ? t('clone.cloning') : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
