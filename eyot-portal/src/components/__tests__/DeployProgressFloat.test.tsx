import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeployProgressFloat, { deployWatchConfig } from '@/components/DeployProgressFloat';
import { ApiError, api } from '@/lib/api';
import { fetchDeploySnapshot, streamDeployProgress } from '@/lib/api/deploy';
import { useDeployProgressStore } from '@/stores/deployProgressStore';
import { useSessionStore } from '@/stores/session';

vi.mock('@/lib/api/deploy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/deploy')>();
  return {
    ...actual,
    fetchDeploySnapshot: vi.fn(),
    streamDeployProgress: vi.fn(),
    cancelDeploy: vi.fn(),
  };
});

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: vi.fn() };
});

const mockedSnapshot = vi.mocked(fetchDeploySnapshot);
const mockedStream = vi.mocked(streamDeployProgress);
const mockedApi = vi.mocked(api);

function renderFloat() {
  return render(
    <MemoryRouter>
      <DeployProgressFloat />
    </MemoryRouter>,
  );
}

function startJob(phase: 'running' | 'failed' | 'timeout' = 'running') {
  useDeployProgressStore.setState({
    job: {
      recordId: 'rec-1',
      instanceId: 'inst-1',
      workspaceId: 'ws-1',
      startedAt: Date.now(),
      minimized: false,
      phase,
      currentStep: 8,
      stepStatus: 'running',
      message: phase === 'failed' ? 'boom' : null,
      stepNames: ['healthz_watch'],
    },
  });
}

describe('DeployProgressFloat', () => {
  beforeEach(() => {
    mockedSnapshot.mockReset();
    mockedStream.mockReset();
    mockedApi.mockReset();
    deployWatchConfig.pollIntervalMs = 20;
    deployWatchConfig.failThreshold = 3;
    useDeployProgressStore.setState({ job: null });
    useSessionStore.setState({
      token: 'jwt',
      user: null,
      currentOrgId: null,
      currentNamespaceId: null,
    });
  });

  it('shows connection-lost after consecutive snapshot failures', async () => {
    mockedSnapshot.mockRejectedValue(new Error('network'));
    mockedStream.mockRejectedValue(new Error('sse'));
    startJob('running');
    renderFloat();
    expect(await screen.findByTestId('deploy-connection-lost', {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByTestId('deploy-retry-connection')).toBeTruthy();
  });

  it('shows record-missing on 404 snapshot', async () => {
    mockedSnapshot.mockRejectedValue(new ApiError(404, { message: 'not found' }));
    mockedStream.mockRejectedValue(new Error('sse'));
    startJob('running');
    renderFloat();
    expect(await screen.findByTestId('deploy-record-missing')).toBeTruthy();
    fireEvent.click(screen.getByTestId('deploy-close'));
    expect(useDeployProgressStore.getState().job).toBeNull();
  });

  it('retries a failed deploy by posting /instances/{id}/deploy', async () => {
    mockedApi.mockResolvedValue({ id: 'rec-2', instance_id: 'inst-1' } as never);
    startJob('failed');
    renderFloat();
    fireEvent.click(screen.getByTestId('deploy-retry'));
    await waitFor(() => {
      expect(mockedApi).toHaveBeenCalledWith('/instances/inst-1/deploy', { method: 'POST' });
    });
    await waitFor(() => {
      expect(useDeployProgressStore.getState().job?.recordId).toBe('rec-2');
      expect(useDeployProgressStore.getState().job?.phase).toBe('running');
    });
  });
});
