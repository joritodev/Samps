import type { PermissionCode } from "@/lib/permissions/codes";

/** Agrupa os códigos de permissão por área, na ordem em que a tela os exibe. */
export const PERMISSION_GROUPS: { label: string; codes: PermissionCode[] }[] = [
  {
    label: "Clientes",
    codes: [
      "clients.view_all",
      "clients.view_assigned",
      "clients.create",
      "clients.edit",
    ],
  },
  {
    label: "Usuários",
    codes: ["users.create", "users.edit", "users.deactivate"],
  },
  {
    label: "Demandas",
    codes: [
      "demands.create",
      "demands.edit",
      "demands.assign",
      "demands.change_deadline",
      "demands.change_priority",
      "demands.extra_create",
    ],
  },
  {
    label: "Projetos e captações",
    codes: ["projects.create", "shoots.create"],
  },
  {
    label: "Portal do cliente",
    codes: ["portal.view", "portal.view_as_client", "portal.release_info"],
  },
  {
    label: "Indicadores e histórico",
    codes: [
      "indicators.view",
      "productivity.view",
      "timers.view",
      "reports.view",
      "history.view",
    ],
  },
  {
    label: "Administração",
    codes: ["settings.access", "roles.manage"],
  },
];
