import { SectorsSettings } from "@/components/agency/sectors-settings";
import { requireSettingsSection } from "@/lib/agency/require-settings-section";
import { db } from "@/lib/db";
import { listSectors } from "@/lib/services/settings.service";

export default async function SetoresSettingsPage() {
  await requireSettingsSection("/configuracoes/setores");
  const [sectors, leaders] = await Promise.all([
    listSectors(true),
    db.user.findMany({
      where: { status: "ACTIVE", userType: { not: "EXTERNAL_CLIENT" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SectorsSettings
      leaders={leaders}
      sectors={sectors.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        color: s.color,
        isActive: s.isActive,
        distributionMethod: s.distributionMethod,
        leaderId: s.leaderId,
        leaderName: s.leader?.name ?? null,
        userCount: s._count.users,
      }))}
    />
  );
}
