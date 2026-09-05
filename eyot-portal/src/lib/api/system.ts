/**
 * System operational endpoints (dependency watchdog).
 */

import { api } from '@/lib/api';

export type DependencyStatus = {
  readonly name: string;
  readonly ok: boolean;
  readonly detail?: string | null;
};

export type DependenciesSnapshot = {
  readonly dependencies: readonly DependencyStatus[];
  readonly ok: boolean;
  readonly checked_at: string;
};

export function fetchSystemDependencies(): Promise<DependenciesSnapshot> {
  return api<DependenciesSnapshot>('/system/dependencies');
}
