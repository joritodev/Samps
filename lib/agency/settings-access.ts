import type { PermissionCode } from "@/lib/permissions/codes";

/**
 * Quem pode ver cada seção do hub.
 * Sem `anyOf` = preferência pessoal, disponível para qualquer usuário autenticado.
 */
export type SettingsSectionAccess = {
  href: string;
  anyOf?: PermissionCode[];
};

export const SETTINGS_SECTION_ACCESS: SettingsSectionAccess[] = [
  { href: "/configuracoes/temas" },
  { href: "/configuracoes/notificacoes" },
  {
    href: "/configuracoes/empresa",
    anyOf: ["settings.access"],
  },
  {
    href: "/configuracoes/usuarios",
    anyOf: ["settings.access", "users.edit", "users.create"],
  },
  {
    href: "/configuracoes/funcoes",
    anyOf: ["roles.manage"],
  },
  {
    href: "/configuracoes/setores",
    anyOf: ["settings.access"],
  },
  {
    href: "/configuracoes/tipos",
    anyOf: ["settings.access"],
  },
  {
    href: "/configuracoes/prioridades",
    anyOf: ["settings.access"],
  },
  {
    href: "/configuracoes/status",
    anyOf: ["settings.access"],
  },
  {
    href: "/configuracoes/contratos",
    anyOf: ["settings.access"],
  },
  {
    href: "/configuracoes/portal",
    anyOf: ["settings.access", "portal.view"],
  },
  {
    href: "/configuracoes/avisos",
    anyOf: ["settings.access"],
  },
];

export function canSeeSettingsSection(
  permissions: string[],
  href: string
): boolean {
  const rule = SETTINGS_SECTION_ACCESS.find((s) => s.href === href);
  if (!rule) return false;
  if (!rule.anyOf?.length) return true;
  return rule.anyOf.some((code) => permissions.includes(code));
}
