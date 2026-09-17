import Link from "next/link";
import { AnnouncementsManager } from "@/components/agency/announcements-manager";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { listAllAnnouncements } from "@/lib/services/announcements.service";

export default async function ConfiguracoesAvisosPage() {
  await requireSettingsSection("/configuracoes/avisos");
  const rows = await listAllAnnouncements();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <Link
          href="/configuracoes"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Configurações
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          Avisos gerais
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Comunicados para a equipe. Aparecem no megafone e, se a pessoa já
          estiver logada, num pop-up.
        </p>
      </header>
      <AnnouncementsManager
        initialItems={rows.map((row) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          kind: row.kind,
          startsAt: row.startsAt.toISOString(),
          endsAt: row.endsAt?.toISOString() ?? null,
          active: row.active,
          authorName: row.author.name,
        }))}
      />
    </div>
  );
}
