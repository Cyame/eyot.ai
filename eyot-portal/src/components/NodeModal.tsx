import { Bot, Cpu, LoaderCircle, Trash, X } from 'lucide-react';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TopologyNode } from '@/lib/types';

type NodeModalProps = {
  readonly node: TopologyNode;
  readonly onClose: () => void;
  readonly onRemove?: (node: TopologyNode) => Promise<void>;
};

export function NodeModal({ node, onClose, onRemove }: NodeModalProps): ReactElement {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [removing, setRemoving] = useState(false);
  const canRemove = onRemove !== undefined && node.kind !== 'hub';
  const isLostOne = node.instanceId !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || dialog === null) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const Icon = node.instanceId === null ? Bot : Cpu;

  async function handleRemove() {
    if (!canRemove || onRemove === undefined || removing) return;
    const confirmKey = isLostOne
      ? 'topology.removeLostOneConfirm'
      : 'topology.removeAwakenedConfirm';
    const ok = window.confirm(t(confirmKey, { name: node.label }));
    if (!ok) return;
    setRemoving(true);
    try {
      await onRemove(node);
    } finally {
      setRemoving(false);
    }
  }

  return (
    /* biome-ignore lint/a11y/noStaticElementInteractions: backdrop click dismisses the modal; dialog remains keyboard accessible */
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-overlay sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="topology-node-modal-title"
        tabIndex={-1}
        data-testid="topology-node-modal"
        className="flex h-full w-full origin-center animate-topology-pop flex-col overflow-hidden bg-surface shadow-lg outline-none sm:h-[min(640px,calc(100vh-3rem))] sm:w-[min(920px,calc(100vw-3rem))] sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-brand-fg">
              <Icon className="size-5" />
            </span>
            <div>
              <h2 id="topology-node-modal-title" className="text-lg font-semibold text-ink">
                {node.label}
              </h2>
              <p className="font-mono text-xs text-muted">{node.slug}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('topology.closeDetails')}
            className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-muted"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="grid flex-1 gap-4 overflow-auto p-5 md:grid-cols-3">
          <section className="rounded-xl border border-line p-4 md:col-span-2">
            <h3 className="font-semibold text-ink">{t('topology.instanceDetails')}</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">ID</dt>
                <dd className="font-mono">{node.instanceId ?? node.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('topology.status')}</dt>
                <dd>{node.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{t('topology.activeHash')}</dt>
                <dd className="max-w-64 truncate font-mono">{node.activeHash ?? '—'}</dd>
              </div>
            </dl>
          </section>
          <aside className="rounded-xl border border-line bg-surface-muted p-4">
            <h3 className="font-semibold text-ink">{t('topology.actions')}</h3>
            {node.outdated ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {t('topology.outdatedNotice')}
              </p>
            ) : null}
            {canRemove ? (
              <button
                type="button"
                disabled={removing}
                onClick={() => {
                  void handleRemove();
                }}
                data-testid={`topology-node-remove-${node.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-surface px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
              >
                {removing ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash className="size-4" aria-hidden="true" />
                )}
                <span>
                  {isLostOne ? t('topology.removeLostOne') : t('topology.removeAwakened')}
                </span>
              </button>
            ) : null}
            {canRemove ? (
              <p className="mt-2 text-xs text-muted">{t('topology.removeHint')}</p>
            ) : null}
          </aside>
        </div>
        <footer className="border-t border-line p-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:bg-brand-hover"
          >
            {t('topology.backToTopology')}
          </button>
        </footer>
      </div>
    </div>
  );
}
