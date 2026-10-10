import { notFound } from "next/navigation";
import { UserType } from "@prisma/client";
import { ProjectDetailView, type ProjectDetailData } from "@/components/work/project-detail-view";
import { toHistoryEntries } from "@/components/work/history-list";
import { allowedProjectTransitions } from "@/lib/agency/work/project-flow";
import { toDateKey } from "@/lib/agency/work/dates";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { getProjectDetail } from "@/lib/services/projects.service";
import { listWorkFormOptions } from "@/lib/services/work-options.service";

export default async function ProjetoDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const detail = await getProjectDetail(user, params.id);
  if (!detail) notFound();
  const { project, progress, suggestion, history } = detail;

  const canWrite = hasPermission(user.permissions, "projects.create") && user.userType !== UserType.EXTERNAL_CLIENT;
  const canCreateDemand = hasPermission(user.permissions, "demands.create");
  const [options, sectors, priorities] = await Promise.all([
    canWrite ? listWorkFormOptions(user) : Promise.resolve({ clients: [], users: [] }),
    db.sector.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.priorityLevel.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const data: ProjectDetailData = {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    outsideContract: project.outsideContract,
    clientId: project.clientId,
    clientName: project.client.name,
    ownerName: project.owner?.name ?? null,
    startDate: project.startDate?.toISOString() ?? null,
    dueDate: project.dueDate?.toISOString() ?? null,
    participants: project.participants.map((p) => p.user.name),
    progress,
    suggestion: suggestion ? { next: suggestion.next, reason: suggestion.reason } : null,
    allowedStatuses: [...allowedProjectTransitions(project.status)],
    demands: project.demands.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      dueDate: d.dueDate?.toISOString() ?? null,
      assigneeName: d.assignee?.name ?? null,
      sectorName: d.sector?.name ?? null,
    })),
    shoots: project.shoots.map((s) => ({ id: s.id, title: s.title, date: s.date.toISOString(), status: s.status })),
    history: toHistoryEntries(history),
    form: {
      id: project.id,
      clientId: project.clientId,
      title: project.title,
      description: project.description ?? "",
      ownerId: project.ownerId ?? "",
      startDate: toDateKey(project.startDate),
      dueDate: toDateKey(project.dueDate),
      outsideContract: project.outsideContract,
      participantIds: project.participants.map((p) => p.userId),
    },
  };

  return (
    <ProjectDetailView
      data={data}
      canWrite={canWrite}
      isManagement={user.userType === UserType.ADMIN || user.userType === UserType.MANAGEMENT}
      users={options.users}
      sectors={sectors}
      priorities={priorities}
      currentUserId={user.id}
      canCreateDemand={canCreateDemand}
    />
  );
}
