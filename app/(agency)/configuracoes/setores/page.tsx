import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function SetoresSettingsPage() {
  await requireSettingsSection("/configuracoes/setores");
  return <SettingsSectionStub title="Setores" />;
}
