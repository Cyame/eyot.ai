import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatusBar from '@/components/StatusBar';
import { fetchMe } from '@/lib/api/auth';
import { useSessionStore } from '@/stores/session';

vi.mock('@/lib/api/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/auth')>();
  return { ...actual, fetchMe: vi.fn() };
});

const mockedFetchMe = vi.mocked(fetchMe);

beforeEach(() => {
  mockedFetchMe.mockReset();
  useSessionStore.setState({
    token: 'jwt',
    user: null,
    currentOrgId: 'org-1',
    currentNamespaceId: null,
  });
});

describe('StatusBar', () => {
  it('shows the sapiens gene label instead of raw can_* chips, and expands the rest', async () => {
    mockedFetchMe.mockResolvedValue({
      id: 'user-1',
      username: 'op',
      nickname: null,
      email: 'op@test.local',
      is_super_admin: true,
      identity: 'system',
      locked_gene_slugs: [],
      extra_gene_slugs: [],
      org_identity: {
        organization_id: 'org-1',
        display_label: 'owner',
        atoms: [
          'can_manage_organization',
          'can_manage_org_members',
          'can_edit_workspace',
          'can_view_workspace',
        ],
      },
    } as never);

    render(<StatusBar />);

    const trigger = await screen.findByTestId('status-bar');
    expect(trigger).toHaveTextContent('Owner');
    expect(trigger).toHaveTextContent('Sapiens gene');
    expect(trigger).toHaveTextContent('Manage continent');
    expect(trigger).toHaveTextContent('+2');
    expect(trigger).not.toHaveTextContent('can_manage_organization');

    fireEvent.click(trigger);
    const panel = await screen.findByTestId('status-bar-permissions');
    expect(panel).toHaveTextContent('Edit habitats');
    expect(panel).toHaveTextContent('View habitats');
    expect(panel).not.toHaveTextContent('can_edit_workspace');
  });
});
