import { ShootsListView } from "@/components/work/shoots-list-view";
import { SHOOT_STATUS_LABEL } from "@/lib/agency/labels";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { listOpenProjectOptions } from "@/lib/services/projects.service";
import { listShoots } from "@/lib/services/shoots.service";
import { listWorkFormOptions } from "@/lib/services/work-options.service";

export default async function CaptacoesPage() {
  const user = await requireAuth();
  const canCreate = hasPermission(user.permissions, "shoots.create");
  const [shoots, options, projects] = await Promise.all([
    listShoots(user),
    canCreate ? listWorkFormOptions(user) : Promise.resolve({ clients: [], users: [] }),
    canCreate ? listOpenProjectOptions(user) : Promise.resolve([]),
  ]);

  return (
    <ShootsListView
      canCreate={canCreate}
      clients={options.clients}
      users={options.users}
      projects={projects}
      currentUserId={user.id}
      canCreateDemand={hasPermission(user.permissions, "demands.create")}
      items={shoots.map((shoot) => ({
        id: shoot.id,
        href: `/captacoes/${shoot.id}`,
        title: shoot.title,
        clientName: shoot.client.name,
        date: shoot.date.toISOString(),
        status: shoot.status,
        statusLabel: SHOOT_STATUS_LABEL[shoot.status],
        meta: [
          shoot.startTime && shoot.endTime ? `${shoot.startTime} - ${shoot.endTime}` : shoot.startTime,
          shoot.location,
          shoot.project ? `Projeto: ${shoot.project.title}` : null,
          shoot._count.demands > 0
            ? `${shoot._count.demands} ${shoot._count.demands === 1 ? "demanda de edição" : "demandas de edição"}`
            : null,
          shoot.participants.length ? `Equipe: ${shoot.participants.map((p) => p.user.name).join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }))}
    />
  );
}
