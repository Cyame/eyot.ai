import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export type CatalogCardAction = {
  readonly label: string;
  readonly onClick: () => void;
  readonly testId?: string;
  readonly disabled?: boolean;
  readonly title?: string;
};

type CatalogCardProps = {
  readonly avatar: ReactNode;
  readonly slug: string;
  readonly title: string;
  readonly tags?: ReactNode;
  readonly description?: string | null;
  readonly href?: string;
  readonly selected?: boolean;
  readonly primary: CatalogCardAction;
  readonly secondary?: CatalogCardAction;
};

export default function CatalogCard({
  avatar,
  slug,
  title,
  tags,
  description,
  href,
  selected = false,
  primary,
  secondary,
}: CatalogCardProps) {
  const heading = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col items-start gap-3">
        {avatar}
        <p className="font-mono text-xs text-muted">{slug}</p>
      </div>
      <div className="flex min-w-0 flex-col items-end gap-1.5 text-right">
        {tags !== undefined ? (
          <div className="flex flex-wrap items-center justify-end gap-1.5">{tags}</div>
        ) : null}
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
    </div>
  );

  return (
    <article
      data-testid="catalog-card"
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-surface shadow-sm',
        selected ? 'border-brand ring-1 ring-brand/30' : 'border-line',
      )}
    >
      <div className="flex-1 p-5">
        {href !== undefined ? (
          <Link to={href} className="block">
            {heading}
          </Link>
        ) : (
          heading
        )}
        {description !== undefined && description !== null && description !== '' ? (
          <p className="mt-3 line-clamp-3 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      <div
        className={cn(
          'grid border-t border-line',
          secondary === undefined ? 'grid-cols-1' : 'grid-cols-2',
        )}
      >
        <button
          type="button"
          disabled={primary.disabled}
          title={primary.title}
          data-testid={primary.testId}
          onClick={primary.onClick}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold',
            'bg-brand text-brand-fg hover:bg-brand-hover disabled:opacity-50',
            secondary !== undefined ? 'border-r border-brand-hover/40' : '',
          )}
        >
          {primary.label}
        </button>
        {secondary !== undefined ? (
          <button
            type="button"
            disabled={secondary.disabled}
            title={secondary.title}
            data-testid={secondary.testId}
            onClick={secondary.onClick}
            className="inline-flex items-center justify-center gap-1.5 bg-surface px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted disabled:opacity-50"
          >
            {secondary.label}
          </button>
        ) : null}
      </div>
    </article>
  );
}
