import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function PortalSettingsPage() {
  await requireSettingsSection("/configuracoes/portal");
  return <SettingsSectionStub title="Portal do cliente" />;
}
