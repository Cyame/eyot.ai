import { cn } from '@/lib/utils';

type BrandMarkProps = {
  readonly className?: string;
  readonly title?: string;
};

/** River-island glyph — Eyot is a small island in a river. */
export default function BrandMark({ className, title = 'Eyot' }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-5', className)} role="img" aria-label={title}>
      <title>{title}</title>
      <rect width="32" height="32" rx="8" fill="currentColor" opacity="0" />
      <path
        d="M4 20.5c3.2-1.4 6.4-1.4 9.5 0 3.2 1.4 6.4 1.4 9.6 0 1.6-.7 3.2-.7 4.9 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7 22.8c2.8-1 5.6-1 8.4 0 2.8 1 5.6 1 8.5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M10.5 18.2c2.4-4.6 4.2-7 5.5-8.6 1.3 1.6 3.1 4 5.5 8.6-3.6 1.3-7.4 1.3-11 0Z"
        fill="currentColor"
      />
      <path
        d="M16 7.2c.2 1.8.1 3.4-.4 5.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="16" cy="6.4" r="1.3" fill="currentColor" />
    </svg>
  );
}
