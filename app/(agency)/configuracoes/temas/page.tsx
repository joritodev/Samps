import { ThemesSettings } from "@/components/agency/themes-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function TemasSettingsPage() {
  await requireSettingsSection("/configuracoes/temas");
  return <ThemesSettings />;
}
