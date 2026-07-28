import { CatalogSettings } from "@/components/agency/catalog-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { listPriorities } from "@/lib/services/settings.service";

export default async function PrioridadesSettingsPage() {
  await requireSettingsSection("/configuracoes/prioridades");
  const rows = await listPriorities(true);

  return (
    <CatalogSettings
      title="Prioridades"
      description="Níveis de urgência e peso no Top 5"
      kind="priority"
      showColor
      showWeight
      rows={rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        weight: r.weight,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
      }))}
    />
  );
}
