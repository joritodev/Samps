import { CompanySettings } from "@/components/agency/company-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { getAgencySettings } from "@/lib/services/settings.service";

export default async function EmpresaSettingsPage() {
  await requireSettingsSection("/configuracoes/empresa");
  const settings = await getAgencySettings();

  return (
    <CompanySettings
      initial={{
        name: settings.name,
        logoUrl: settings.logoUrl,
        timezone: settings.timezone,
        language: settings.language,
        dateFormat: settings.dateFormat,
        workStartTime: settings.workStartTime,
        workEndTime: settings.workEndTime,
        workDays: settings.workDays,
      }}
    />
  );
}
