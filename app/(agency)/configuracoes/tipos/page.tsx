import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function TiposSettingsPage() {
  await requireSettingsSection("/configuracoes/tipos");
  return <SettingsSectionStub title="Tipos de conteúdo" />;
}
