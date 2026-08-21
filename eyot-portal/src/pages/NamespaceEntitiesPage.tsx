import { AlertCircle, Building2, FlaskConical, LoaderCircle, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import CatalogCard from '@/components/CatalogCard';
import CloneDialog from '@/components/CloneDialog';
import EmptyState from '@/components/EmptyState';
import ProgenitorAvatar from '@/components/ProgenitorAvatar';
import { ApiError, api } from '@/lib/api';
import { fetchMe } from '@/lib/api/auth';
import { type ClonePayload, cloneEntity } from '@/lib/api/clone';
import { resolveError } from '@/lib/apiError';
import type { Entity, OrgIdentity } from '@/lib/types';
import { useEntityModalStore } from '@/stores/entityModalStore';
import { useOnboardingModalStore } from '@/stores/onboardingModalStore';
import { useSessionStore } from '@/stores/session';

type OffsetPage<T> = {
  readonly items: readonly T[];
  readonly offset: number;
  readonly limit: number;
  readonly total: number;
};

export default function NamespaceEntitiesPage() {
  const { t } = useTranslation();
  const { nsId } = useParams<{ nsId: string }>();
  const user = useSessionStore((state) => state.user);
  const isSuperAdmin = user?.is_super_admin ?? false;
  const [orgIdentity, setOrgIdentity] = useState<OrgIdentity | null>(null);
  const canCloneEntity = isSuperAdmin || (orgIdentity?.atoms.includes('can_clone_entity') ?? false);

  const [entities, setEntities] = useState<readonly Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<Entity | null>(null);

  const openOnboarding = useOnboardingModalStore((state) => state.open);
  const openEntityModal = useEntityModalStore((state) => state.open);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setOrgIdentity(me.org_identity ?? null);
      })
      .catch(() => {
        if (!cancelled) setOrgIdentity(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (nsId === undefined) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const page = await api<OffsetPage<Entity>>(
        `/entities?namespace_id=${encodeURIComponent(nsId)}&is_cerebellum=false&limit=200`,
      );
      setEntities(page.items);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setIsUnauthorized(true);
          return;
        }
      }
      setErrorMessage(resolveError(t, error));
    } finally {
      setIsLoading(false);
    }
  }, [nsId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleClone = useCallback(
    async (entity: Entity, payload: ClonePayload) => {
      setCloningId(entity.id);
      setErrorMessage(null);
      try {
        await cloneEntity(entity.id, payload);
        await refresh();
      } catch (error) {
        setErrorMessage(resolveError(t, error, 'clone.error'));
      } finally {
        setCloningId(null);
        setCloneTarget(null);
      }
    },
    [refresh, t],
  );

  if (isUnauthorized) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="mx-auto w-full max-w-6xl p-6" aria-labelledby="ns-entities-title">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg shadow-sm">
            <Building2 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 id="ns-entities-title" className="text-2xl font-semibold text-ink">
              {t('nav.entities')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t('namespaces.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openOnboarding({ namespaceId: nsId })}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {t('namespaces.summonEntity')}
          </button>
          <button
            type="button"
            disabled={selectedEntityId === null}
            onClick={() => {
              if (selectedEntityId) openEntityModal(selectedEntityId, 'distill');
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted disabled:opacity-50"
          >
            <FlaskConical className="size-4" aria-hidden="true" />
            {t('namespaces.distillTransmute')}
          </button>
        </div>
      </header>

      {errorMessage !== null ? (
        <div
          role="alert"
          className="mb-6 flex gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-surface px-6 py-16 text-sm text-muted">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </div>
      ) : null}

      {!isLoading ? (
        <EntitiesList
          entities={entities}
          selectedId={selectedEntityId}
          canClone={canCloneEntity}
          cloningId={cloningId}
          onSelect={setSelectedEntityId}
          onClone={(entity) => setCloneTarget(entity)}
          onOpen={(id) => openEntityModal(id, 'instances')}
          onOpenDistill={(id) => openEntityModal(id, 'distill')}
          t={t}
        />
      ) : null}

      <CloneDialog
        open={cloneTarget !== null}
        title={t('clone.entity')}
        confirmMessage={t('clone.dialog.confirmEntity', {
          name: cloneTarget?.display_name ?? cloneTarget?.name ?? '',
        })}
        confirmLabel={t('clone.entity')}
        busy={cloneTarget !== null && cloningId === cloneTarget.id}
        onConfirm={(payload) => {
          if (cloneTarget !== null) void handleClone(cloneTarget, payload);
        }}
        onCancel={() => setCloneTarget(null)}
      />
    </section>
  );
}

type TFn = ReturnType<typeof useTranslation>['t'];

function EntitiesList({
  entities,
  selectedId,
  canClone,
  cloningId,
  onSelect,
  onClone,
  onOpen,
  onOpenDistill,
  t,
}: {
  readonly entities: readonly Entity[];
  readonly selectedId: string | null;
  readonly canClone: boolean;
  readonly cloningId: string | null;
  readonly onSelect: (id: string) => void;
  readonly onClone: (entity: Entity) => void;
  readonly onOpen: (id: string) => void;
  readonly onOpenDistill: (id: string) => void;
  readonly t: TFn;
}) {
  if (entities.length === 0) {
    return <EmptyState title={t('namespaces.noEntities')} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity) => (
        <CatalogCard
          key={entity.id}
          selected={selectedId === entity.id}
          avatar={
            <ProgenitorAvatar
              slug={entity.preset_slug}
              label={entity.display_name ?? entity.name}
              size="lg"
            />
          }
          slug={entity.slug}
          title={entity.display_name ?? entity.name}
          tags={
            <>
              <span className="inline-flex rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                {t('nav.entities')}
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelect(entity.id);
                  onOpenDistill(entity.id);
                }}
                data-testid={`entity-transmute-${entity.id}`}
                className="inline-flex items-center rounded-md border border-line px-2 py-0.5 text-xs font-medium text-ink hover:bg-surface-muted"
              >
                {t('namespaces.distillTransmute')}
              </button>
            </>
          }
          primary={{
            label: t('namespaces.summonFromBaseClass'),
            onClick: () => {
              onSelect(entity.id);
              onOpen(entity.id);
            },
          }}
          secondary={
            canClone
              ? {
                  label: cloningId === entity.id ? t('clone.cloning') : t('clone.action'),
                  onClick: () => onClone(entity),
                  testId: `entity-clone-${entity.id}`,
                  disabled: cloningId !== null,
                  title: t('clone.instancesNotCopied'),
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
