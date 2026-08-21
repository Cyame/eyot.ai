import type { CSSProperties } from 'react';
import InitialAvatar, { AVATAR_SIZE_CLASS, type AvatarSize } from '@/components/InitialAvatar';
import {
  PROGENITOR_ACCENT_CLASS,
  type ProgenitorSlug,
  progenitorAvatarSrc,
  resolveProgenitorSlug,
} from '@/lib/progenitorAssets';
import { cn } from '@/lib/utils';

export type AvatarCrop = {
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
};

type ProgenitorAvatarProps = {
  readonly slug: string | null | undefined;
  readonly label?: string;
  readonly size?: AvatarSize;
  readonly crop?: AvatarCrop;
  readonly className?: string;
};

function cropStyle(crop: AvatarCrop | undefined): CSSProperties | undefined {
  if (crop === undefined) return undefined;
  const x = crop.x ?? 50;
  const y = crop.y ?? 50;
  const scale = crop.scale ?? 1;
  return {
    objectPosition: `${x}% ${y}%`,
    transform: scale === 1 ? undefined : `scale(${scale})`,
  };
}

export default function ProgenitorAvatar({
  slug,
  label,
  size = 'md',
  crop,
  className,
}: ProgenitorAvatarProps) {
  const resolved = resolveProgenitorSlug(slug);
  if (resolved === null) {
    return <InitialAvatar name={label ?? slug ?? ''} size={size} className={className} />;
  }
  return (
    <ProgenitorPortrait
      slug={resolved}
      label={label}
      size={size}
      crop={crop}
      className={className}
    />
  );
}

type PortraitProps = {
  readonly slug: ProgenitorSlug;
  readonly label?: string;
  readonly size?: AvatarSize;
  readonly crop?: AvatarCrop;
  readonly className?: string;
};

export function ProgenitorPortrait({ slug, label, size = 'md', crop, className }: PortraitProps) {
  return (
    <span
      data-testid="progenitor-avatar"
      data-progenitor-slug={slug}
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full bg-surface-muted ring-2 ring-offset-1 ring-offset-surface',
        PROGENITOR_ACCENT_CLASS[slug],
        AVATAR_SIZE_CLASS[size],
        className,
      )}
    >
      <img
        src={progenitorAvatarSrc(slug)}
        alt={label ?? slug}
        className="size-full object-cover"
        style={cropStyle(crop)}
      />
    </span>
  );
}
