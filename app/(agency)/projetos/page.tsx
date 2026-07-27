import { ScheduleView } from "@/components/agency/schedule-view";
import { PROJECT_STATUS_LABEL } from "@/lib/agency/labels";
import { requireAuth } from "@/lib/permissions/check";
import { listProjects } from "@/lib/services/projects.service";

export default async function ProjetosPage() {
  const user = await requireAuth();
  const projects = await listProjects(user);

  return (
    <ScheduleView
      title="Projetos"
      description="Entregas de maior escopo, com prazo e progresso"
      dateLabel="Prazo"
      emptyMessage="Nenhum projeto cadastrado"
      items={projects.map((project) => ({
        id: project.id,
        title: project.title,
        clientName: project.client.name,
        date: project.dueDate?.toISOString() ?? null,
        status: project.status,
        statusLabel: PROJECT_STATUS_LABEL[project.status],
        meta: [
          project.owner ? `Resp.: ${project.owner.name}` : null,
          `${project.progress}% concluído`,
          `${project._count.demands} demandas`,
        ]
          .filter(Boolean)
          .join(" · "),
      }))}
    />
  );
}
