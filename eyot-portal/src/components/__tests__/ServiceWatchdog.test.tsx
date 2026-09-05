import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ServiceWatchdog, { watchdogConfig } from '@/components/ServiceWatchdog';
import { ApiError } from '@/lib/api';
import { fetchSystemDependencies } from '@/lib/api/system';
import { useSessionStore } from '@/stores/session';

vi.mock('@/lib/api/system', () => ({
  fetchSystemDependencies: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchSystemDependencies);

describe('ServiceWatchdog', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    watchdogConfig.healthyIntervalMs = 20;
    watchdogConfig.maxBackoffMs = 40;
    useSessionStore.setState({
      token: 'jwt',
      user: null,
      currentOrgId: 'org-1',
      currentNamespaceId: null,
    });
  });

  it('renders failed dependencies and hides after recovery', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        ok: false,
        checked_at: '2026-09-05T00:00:00Z',
        dependencies: [
          { name: 'database', ok: false, detail: 'down' },
          { name: 'kubernetes', ok: true, detail: null },
        ],
      })
      .mockResolvedValue({
        ok: true,
        checked_at: '2026-09-05T00:00:01Z',
        dependencies: [
          { name: 'database', ok: true, detail: null },
          { name: 'kubernetes', ok: true, detail: null },
        ],
      });

    render(<ServiceWatchdog />);
    expect(await screen.findByTestId('service-watchdog-banner')).toBeTruthy();
    expect(screen.getByTestId('service-watchdog-dep-database')).toBeTruthy();
    fireEvent.click(screen.getByTestId('service-watchdog-retry'));
    await waitFor(() => {
      expect(screen.queryByTestId('service-watchdog-banner')).toBeNull();
    });
  });

  it('does not render a banner on 401 and stops polling', async () => {
    mockedFetch.mockRejectedValue(new ApiError(401, { message: 'unauthorized' }));
    render(<ServiceWatchdog />);
    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('service-watchdog-banner')).toBeNull();
    const calls = mockedFetch.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(mockedFetch.mock.calls.length).toBe(calls);
  });
});
