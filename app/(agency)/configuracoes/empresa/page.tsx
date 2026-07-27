import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function EmpresaSettingsPage() {
  await requireSettingsSection("/configuracoes/empresa");
  return <SettingsSectionStub title="Empresa" />;
}
