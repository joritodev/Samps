import { SettingsSectionStub } from "@/components/agency/settings-section-stub";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";

export default async function NotificacoesSettingsPage() {
  await requireSettingsSection("/configuracoes/notificacoes");
  return <SettingsSectionStub title="Notificações" />;
}
