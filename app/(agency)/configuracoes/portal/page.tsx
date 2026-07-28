import { PortalSettings } from "@/components/agency/portal-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { getAgencySettings } from "@/lib/services/settings.service";

export default async function PortalSettingsPage() {
  await requireSettingsSection("/configuracoes/portal");
  const settings = await getAgencySettings();

  return (
    <PortalSettings
      initial={{
        portalName: settings.portalName,
        portalLogoUrl: settings.portalLogoUrl,
        portalColor: settings.portalColor,
      }}
    />
  );
}
