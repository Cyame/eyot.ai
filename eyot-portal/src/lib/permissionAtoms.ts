/**
 * Atomic permissions (权限) vs human-gene packs (智人基因).
 *
 * `can_*` slugs are 权限. Display names are i18n `permissions.atoms.*`.
 * A 智人基因 is a pack (StatusBar `display_label`, custom UserGene rows).
 */

export const PERMISSION_ATOM_SLUGS = [
  'can_manage_organization',
  'can_manage_org_members',
  'can_manage_namespace',
  'can_manage_workspace',
  'can_edit_workspace',
  'can_view_workspace',
  'can_operate_workspace',
  'can_manage_genes',
  'can_manage_capabilities',
  'can_manage_ai_genes',
  'can_clone_base_class',
  'can_clone_entity',
  'can_clone_organization',
  'can_clone_workspace',
  'can_manage_knowledge',
  'can_manage_meetings',
] as const;

export type PermissionAtomSlug = (typeof PERMISSION_ATOM_SLUGS)[number];

const ATOM_SET = new Set<string>(PERMISSION_ATOM_SLUGS);

export function isPermissionAtom(slug: string): boolean {
  return ATOM_SET.has(slug);
}

type Translate = (key: string, options?: { readonly defaultValue?: string }) => string;

export function permissionLabel(t: Translate, slug: string): string {
  return t(`permissions.atoms.${slug}`, { defaultValue: slug });
}
