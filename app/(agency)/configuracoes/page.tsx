import { SettingsHub } from "@/components/agency/settings-hub";
import { requireAuth } from "@/lib/permissions/check";

export default async function ConfiguracoesPage() {
  const user = await requireAuth();
  return <SettingsHub permissions={user.permissions} />;
}
