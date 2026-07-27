import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function UsuariosSettingsPage() {
  await requireSettingsSection("/configuracoes/usuarios");
  return <SettingsSectionStub title="Usuários" />;
}
