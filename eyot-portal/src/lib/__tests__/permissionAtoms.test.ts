import { describe, expect, it } from 'vitest';
import { isPermissionAtom, PERMISSION_ATOM_SLUGS, permissionLabel } from '@/lib/permissionAtoms';

const t = (key: string, options?: { readonly defaultValue?: string }) => {
  if (key === 'permissions.atoms.can_manage_organization') return 'Manage continent';
  return options?.defaultValue ?? key;
};

describe('permissionAtoms', () => {
  it('treats the catalog slugs as 权限, not display names', () => {
    expect(PERMISSION_ATOM_SLUGS).toContain('can_manage_organization');
    expect(isPermissionAtom('can_manage_organization')).toBe(true);
    expect(isPermissionAtom('owner')).toBe(false);
  });

  it('never returns a raw can_* slug when an i18n label exists', () => {
    expect(permissionLabel(t, 'can_manage_organization')).toBe('Manage continent');
  });
});
