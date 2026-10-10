import { ProjectsListView } from "@/components/work/projects-list-view";
import { PROJECT_STATUS_LABEL } from "@/lib/agency/labels";
import { projectProgress } from "@/lib/agency/work/project-flow";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { listProjects } from "@/lib/services/projects.service";
import { listWorkFormOptions } from "@/lib/services/work-options.service";

export default async function ProjetosPage() {
  const user = await requireAuth();
  const canCreate = hasPermission(user.permissions, "projects.create");
  const [projects, options] = await Promise.all([
    listProjects(user),
    canCreate ? listWorkFormOptions(user) : Promise.resolve({ clients: [], users: [] }),
  ]);

  return (
    <ProjectsListView
      canCreate={canCreate}
      clients={options.clients}
      users={options.users}
      currentUserId={user.id}
      items={projects.map((project) => {
        const progress = projectProgress(project.demands.map((d) => d.status));
        return {
          id: project.id,
          href: `/projetos/${project.id}`,
          title: project.title,
          clientName: project.client.name,
          date: project.dueDate?.toISOString() ?? null,
          status: project.status,
          statusLabel: PROJECT_STATUS_LABEL[project.status],
          meta: [
            project.outsideContract ? "Fora do contrato" : null,
            project.owner ? `Resp.: ${project.owner.name}` : null,
            progress.total > 0
              ? `${progress.percent}% concluído (${progress.done}/${progress.total} demandas)`
              : "Sem demandas ainda",
          ]
            .filter(Boolean)
            .join(" · "),
        };
      })}
    />
  );
}
