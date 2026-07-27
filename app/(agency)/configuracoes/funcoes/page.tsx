import { RolesSettings } from "@/components/agency/roles-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { hasPermission } from "@/lib/permissions/resolve";
import { listPermissions, listRoles } from "@/lib/services/settings.service";

export default async function FuncoesSettingsPage() {
  const user = await requireSettingsSection("/configuracoes/funcoes");
  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissions(),
  ]);

  return (
    <RolesSettings
      canManage={hasPermission(user.permissions, "roles.manage")}
      availableCodes={permissions.map((permission) => permission.code)}
      roles={roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        userCount: role._count.users,
        permissions: role.permissions.map((entry) => entry.permission.code),
      }))}
    />
  );
}
