import { CatalogSettings } from "@/components/agency/catalog-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { listActivityStatuses } from "@/lib/services/settings.service";

export default async function StatusSettingsPage() {
  await requireSettingsSection("/configuracoes/status");
  const rows = await listActivityStatuses(true);

  return (
    <CatalogSettings
      title="Status"
      description="Fluxos de atividade configuráveis"
      kind="status"
      showColor
      showFinal
      rows={rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        color: r.color,
        sortOrder: r.sortOrder,
        isFinal: r.isFinal,
        isActive: r.isActive,
      }))}
    />
  );
}
