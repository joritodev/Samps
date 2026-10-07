import { CatalogSettings } from "@/components/agency/catalog-settings";
import { ContentTypeRequirementsForm } from "@/components/agency/content-type-requirements-form";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { listContentTypes } from "@/lib/services/settings.service";

export default async function TiposSettingsPage() {
  await requireSettingsSection("/configuracoes/tipos");
  const rows = await listContentTypes(true);

  return (
    <CatalogSettings
      title="Tipos de conteúdo"
      description="Formatos usados em demandas e contratos. Em cada tipo, marque os campos obrigatórios do briefing."
      kind="contentType"
      rows={rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
      }))}
      rowExtras={Object.fromEntries(
        rows.map((contentType) => [
          contentType.id,
          <ContentTypeRequirementsForm
            key={contentType.id}
            contentType={{
              id: contentType.id,
              name: contentType.name,
              requiresDuration: contentType.requiresDuration,
              requiresFormat: contentType.requiresFormat,
              requiresCaption: contentType.requiresCaption,
              requiresReference: contentType.requiresReference,
              requiresRawDelivery: contentType.requiresRawDelivery,
            }}
          />,
        ])
      )}
    />
  );
}
