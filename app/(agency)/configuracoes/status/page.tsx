import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function StatusSettingsPage() {
  await requireSettingsSection("/configuracoes/status");
  return <SettingsSectionStub title="Status" />;
}
