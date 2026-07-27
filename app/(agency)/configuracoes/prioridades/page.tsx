import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function PrioridadesSettingsPage() {
  await requireSettingsSection("/configuracoes/prioridades");
  return <SettingsSectionStub title="Prioridades" />;
}
