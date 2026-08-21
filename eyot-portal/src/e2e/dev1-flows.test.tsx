import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useDebugNavStore } from '@/stores/debugNav';
import { useSessionStore } from '@/stores/session';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: vi.fn() };
});

const mockedApi = vi.mocked(api);

const ME_PAYLOAD = {
  id: 'user-1',
  username: 'operator',
  nickname: null,
  email: 'op@test.local',
  is_super_admin: true,
  identity: 'system',
  locked_gene_slugs: [],
  extra_gene_slugs: [],
  org_identity: {
    organization_id: 'org-1',
    atoms: ['can_edit_workspace'],
    display_label: 'editor',
  },
};

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/orgs/:orgId" element={<AppShell />}>
          <Route index element={<p>Dashboard destination</p>} />
          <Route path="debug" element={<p>Debug destination</p>} />
        </Route>
        <Route path="/account" element={<p>Account destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function desktopNav() {
  return within(screen.getByRole('navigation', { name: 'Primary' }));
}

beforeEach(() => {
  mockedApi.mockReset();
  mockedApi.mockResolvedValue(ME_PAYLOAD);
  localStorage.clear();
  useDebugNavStore.setState({ hidden: false });
  useSessionStore.setState({
    token: 'jwt',
    user: {
      user_id: 'user-1',
      username: 'operator',
      identity: 'system',
      is_super_admin: true,
      token: 'jwt',
    },
    currentOrgId: 'org-1',
    currentNamespaceId: null,
  });
});

describe('0.5.3.dev1 shell flows', () => {
  it('keeps Debug under Account, not in the World section', () => {
    renderShell('/orgs/org-1');
    const nav = desktopNav();
    const account = nav.getByRole('link', { name: 'Account' });
    const debug = nav.getByTestId('nav-debug');
    expect(debug).toHaveAttribute('href', '/orgs/org-1/debug');
    expect(account.compareDocumentPosition(debug) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides Debug from navigation when the super-admin preference is on', () => {
    useDebugNavStore.getState().setHidden(true);
    renderShell('/orgs/org-1');
    expect(desktopNav().queryByTestId('nav-debug')).not.toBeInTheDocument();
  });

  it('keeps a single theme toggle in the shell footer', () => {
    renderShell('/orgs/org-1');
    expect(screen.getAllByTestId('theme-toggle')).toHaveLength(1);
  });

  it('keeps Control studio only in the sidebar', () => {
    renderShell('/orgs/org-1');
    expect(screen.getAllByText('Control studio')).toHaveLength(1);
    expect(within(screen.getByRole('banner')).queryByText('Control studio')).not.toBeInTheDocument();
  });
});
