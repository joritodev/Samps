import { CatalogSettings } from "@/components/agency/catalog-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { listContentTypes } from "@/lib/services/settings.service";

export default async function TiposSettingsPage() {
  await requireSettingsSection("/configuracoes/tipos");
  const rows = await listContentTypes(true);

  return (
    <CatalogSettings
      title="Tipos de conteúdo"
      description="Formatos usados em demandas e contratos"
      kind="contentType"
      rows={rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
      }))}
    />
  );
}
