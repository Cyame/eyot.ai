import { cn } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const AVATAR_SIZE_CLASS: Record<AvatarSize, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
  xl: 'size-14 text-base',
};

type InitialAvatarProps = {
  readonly name: string;
  readonly size?: AvatarSize;
  readonly className?: string;
};

export function firstGrapheme(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') return '?';
  const segmenter =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null;
  if (segmenter !== null) {
    const first = segmenter.segment(trimmed)[Symbol.iterator]().next().value;
    if (first !== undefined) return first.segment.toUpperCase();
  }
  return [...trimmed][0]?.toUpperCase() ?? '?';
}

export default function InitialAvatar({ name, size = 'md', className }: InitialAvatarProps) {
  return (
    <span
      data-testid="initial-avatar"
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-surface-muted font-semibold text-ink ring-1 ring-line',
        AVATAR_SIZE_CLASS[size],
        className,
      )}
    >
      {firstGrapheme(name)}
    </span>
  );
}
