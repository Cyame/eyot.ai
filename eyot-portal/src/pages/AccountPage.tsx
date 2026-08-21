import { AlertCircle, KeyRound, LoaderCircle, User } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type AccountProfile,
  changeAccountPassword,
  fetchAccount,
  updateAccount,
} from '@/lib/api/users';
import { resolveError } from '@/lib/apiError';

const IDENTITY_LABEL_KEYS: Record<string, string> = {
  system: 'identity.system',
  org: 'identity.org',
  namespace: 'identity.namespace',
  workspace: 'identity.workspace',
  member: 'identity.member',
};

export default function AccountPage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAccount();
      setProfile(data);
      setEmail(data.email);
      setNickname(data.nickname ?? '');
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setErrorMessage(null);
    try {
      const next = await updateAccount({
        email,
        nickname: nickname.trim() || null,
      });
      setProfile(next);
      setNickname(next.nickname ?? '');
      setNotice(t('account.saved'));
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordBusy(true);
    setNotice(null);
    setErrorMessage(null);
    try {
      await changeAccountPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setNotice(t('account.passwordChanged'));
    } catch (error) {
      setErrorMessage(resolveError(t, error));
    } finally {
      setPasswordBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 p-16 text-sm text-muted">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        {t('common.loading')}
      </div>
    );
  }

  const identityKey = profile?.identity ? IDENTITY_LABEL_KEYS[profile.identity] : null;

  return (
    <section className="mx-auto w-full max-w-3xl p-6" aria-labelledby="account-title">
      <header className="mb-6 flex items-start gap-4">
        <span className="grid size-11 place-items-center rounded-xl bg-brand text-brand-fg">
          <User className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 id="account-title" className="text-2xl font-semibold text-ink">
            {t('account.title')}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('account.subtitle')}</p>
        </div>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="mb-4 flex gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void handleSaveProfile(e)}
        className="mb-6 rounded-xl border border-line bg-surface p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-ink">{t('account.profile')}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{t('account.username')}</span>
            <input
              value={profile?.username ?? ''}
              disabled
              className="w-full rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm text-muted"
            />
            <span className="mt-1 block text-xs text-muted-subtle">
              {t('account.usernameHint')}
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{t('account.nickname')}</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('account.nicknameHint')}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-ink">{t('account.email')}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </label>
        </div>
        <p className="mt-3 text-sm text-muted">
          {t('account.identity')}:{' '}
          <span className="font-medium text-ink">
            {identityKey ? t(identityKey) : t('identity.member')}
          </span>
        </p>
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('account.lockedGenes')}
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {(profile?.locked_genes ?? []).map((g) => (
              <li
                key={g.id}
                className="rounded-md bg-surface-muted px-2 py-1 font-mono text-xs text-muted"
              >
                {g.slug}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('account.extraGenes')}
          </p>
          {(profile?.extra_genes ?? []).length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t('account.noExtraGenes')}</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-2">
              {profile?.extra_genes.map((g) => (
                <li
                  key={g.id}
                  className="rounded-md bg-brand-soft px-2 py-1 font-mono text-xs text-brand"
                >
                  {g.slug}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-hover disabled:opacity-60"
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>

      <form
        onSubmit={(e) => void handleChangePassword(e)}
        className="rounded-xl border border-line bg-surface p-5 shadow-sm"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <KeyRound className="size-4" aria-hidden="true" />
          {t('account.changePassword')}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{t('account.currentPassword')}</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">{t('account.newPassword')}</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={passwordBusy}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted disabled:opacity-60"
          >
            {passwordBusy ? t('common.loading') : t('account.changePassword')}
          </button>
        </div>
      </form>
    </section>
  );
}
