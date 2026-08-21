import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

export default function ForbiddenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const missing = searchParams.get('missing') ?? '';
  const gene = searchParams.get('gene') ?? '';
  const from = searchParams.get('from') ?? '';

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-lg">
        <ShieldAlert className="mx-auto size-12 text-danger" aria-hidden="true" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{t('forbidden.title')}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-subtle">{t('forbidden.detail')}</p>

        {gene.length > 0 ? (
          <p className="mt-4 text-sm text-nav-muted">
            {t('forbidden.currentGene')}: <span className="font-mono">{gene}</span>
          </p>
        ) : null}

        {missing.length > 0 ? (
          <p className="mt-2 text-sm text-nav-muted">
            {t('forbidden.missing')}: <span className="font-mono">{missing}</span>
          </p>
        ) : null}

        {from.length > 0 ? (
          <p className="mt-2 truncate text-xs text-muted">
            {t('forbidden.from')}: {decodeURIComponent(from)}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('forbidden.goBack')}
          </button>
          <Link
            to="/namespaces"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-hover"
          >
            {t('forbidden.goNamespaces')}
          </Link>
        </div>
      </section>
    </main>
  );
}
