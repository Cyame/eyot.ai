import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type EmptyStateProps = {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
  readonly compact?: boolean;
  readonly tone?: 'default' | 'danger' | 'earth';
};

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
  tone = 'default',
}: EmptyStateProps) {
  const isDanger = tone === 'danger';
  const isEarth = tone === 'earth';
  return (
    <div
      data-testid="empty-state"
      className={cn(
        'grid place-items-center rounded-xl border text-center',
        compact ? 'px-3 py-6' : 'px-6 py-16',
        isDanger
          ? 'border-danger/40 bg-danger-soft'
          : isEarth
            ? 'border-earth-line bg-earth'
            : 'border-dashed border-line-strong bg-surface',
        className,
      )}
    >
      <Icon
        className={cn(
          compact ? 'size-5' : 'size-8',
          isDanger ? 'text-danger' : isEarth ? 'text-ink-muted' : 'text-muted-subtle',
        )}
        aria-hidden="true"
      />
      <p
        className={cn(
          'font-semibold',
          compact ? 'mt-2 text-xs' : 'mt-3 text-sm',
          isDanger ? 'text-danger' : 'text-ink',
        )}
      >
        {title}
      </p>
      {description !== undefined && description !== '' ? (
        <p
          className={cn(
            compact ? 'mt-1 text-xs' : 'mt-1 text-sm',
            isDanger ? 'text-danger/80' : 'text-ink-muted',
          )}
        >
          {description}
        </p>
      ) : null}
      {action !== undefined ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
