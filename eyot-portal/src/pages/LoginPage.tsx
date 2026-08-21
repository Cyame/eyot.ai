import { AlertCircle, LoaderCircle, LogIn, UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import BrandMark from '@/components/BrandMark';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { ApiError, api } from '@/lib/api';
import { resolveError } from '@/lib/apiError';
import { useSessionStore } from '@/stores/session';

type TokenResponse = {
  readonly access_token: string;
  readonly token_type: string;
  readonly user?: {
    readonly id: string;
    readonly username: string;
    readonly nickname?: string | null;
    readonly email: string;
    readonly is_super_admin: boolean;
    readonly identity?: string | null;
    readonly locked_gene_slugs?: readonly string[];
    readonly extra_gene_slugs?: readonly string[];
  } | null;
};

type Mode = 'sign-in' | 'register';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useSessionStore((state) => state.token);
  const setToken = useSessionStore((state) => state.setToken);
  const mode: Mode = searchParams.get('mode') === 'register' ? 'register' : 'sign-in';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (token !== null) {
    return <Navigate to="/orgs/picker" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      let endpoint: string;
      let body: Record<string, string>;
      if (mode === 'register') {
        endpoint = '/auth/register';
        body = { username, email, password };
      } else {
        endpoint = '/auth/login';
        body = { username, password };
      }
      const response = await api<TokenResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setToken(response.access_token, {
        user_id: response.user?.id ?? '',
        username: response.user?.username,
        nickname: response.user?.nickname ?? null,
        email: response.user?.email,
        is_super_admin: response.user?.is_super_admin ?? false,
        identity: response.user?.identity ?? null,
        locked_gene_slugs: response.user?.locked_gene_slugs ?? [],
        extra_gene_slugs: response.user?.extra_gene_slugs ?? [],
        token: response.access_token,
      });
      navigate('/orgs/picker', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(resolveError(t, error));
        return;
      }
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  const heading = mode === 'register' ? t('login.registerHeading') : t('login.signInHeading');
  const tagline = mode === 'register' ? t('login.registerTagline') : t('login.signInTagline');
  const submitLabel = mode === 'register' ? t('login.createAccount') : t('login.submit');
  const switchLabel = mode === 'register' ? t('login.switchToSignIn') : t('login.switchToRegister');
  const switchTo: Mode = mode === 'register' ? 'sign-in' : 'register';
  const switchHref = switchTo === 'register' ? '/login?mode=register' : '/login';

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-brand-fg shadow-sm">
              <BrandMark className="size-6" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">{t('common.appName')}</p>
              <p className="text-xs text-muted">{t('common.appTagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle variant="surface" />
            <LanguageSwitcher variant="surface" placement="down" />
          </div>
        </div>

        <div className="mb-6" role="tablist" aria-label="Authentication mode">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{tagline}</p>
        </div>

        {errorMessage !== null ? (
          <div
            role="alert"
            className="mb-5 flex gap-3 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-ink">
              {t('login.username')}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.currentTarget.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {mode === 'register' ? (
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink">
              {t('login.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-subtle focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            {mode === 'register' ? (
              <p className="mt-1.5 text-xs text-muted">{t('login.passwordHint')}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : mode === 'register' ? (
              <UserPlus className="size-4" aria-hidden="true" />
            ) : (
              <LogIn className="size-4" aria-hidden="true" />
            )}
            {submitLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link to={switchHref} className="text-brand transition-colors hover:text-brand-hover">
            {switchLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
