import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function ContratosSettingsPage() {
  await requireSettingsSection("/configuracoes/contratos");
  return <SettingsSectionStub title="Contratos" />;
}
