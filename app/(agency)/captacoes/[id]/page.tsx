import { notFound } from "next/navigation";
import { UserType } from "@prisma/client";
import { toHistoryEntries } from "@/components/work/history-list";
import { ShootDetailView, type ShootDetailData } from "@/components/work/shoot-detail-view";
import { toDateKey } from "@/lib/agency/work/dates";
import { allowedShootTransitions } from "@/lib/agency/work/shoot-flow";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { listOpenProjectOptions } from "@/lib/services/projects.service";
import { getShootDetail } from "@/lib/services/shoots.service";
import { listWorkFormOptions } from "@/lib/services/work-options.service";

export default async function CaptacaoDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const detail = await getShootDetail(user, params.id);
  if (!detail) notFound();
  const { shoot, history } = detail;

  const canWrite = hasPermission(user.permissions, "shoots.create") && user.userType !== UserType.EXTERNAL_CLIENT;
  const [options, projects] = await Promise.all([
    canWrite ? listWorkFormOptions(user) : Promise.resolve({ clients: [], users: [] }),
    canWrite ? listOpenProjectOptions(user) : Promise.resolve([]),
  ]);

  const data: ShootDetailData = {
    id: shoot.id,
    title: shoot.title,
    status: shoot.status,
    clientId: shoot.clientId,
    clientName: shoot.client.name,
    date: shoot.date.toISOString(),
    startTime: shoot.startTime,
    endTime: shoot.endTime,
    location: shoot.location,
    shootType: shoot.shootType,
    notes: shoot.notes,
    ownerName: shoot.owner?.name ?? null,
    project: shoot.project,
    participants: shoot.participants.map((p) => p.user.name),
    materialUrl: shoot.materialUrl,
    completedAt: shoot.completedAt?.toISOString() ?? null,
    nextStatuses: [...allowedShootTransitions(shoot.status)],
    demands: shoot.demands.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      dueDate: d.dueDate?.toISOString() ?? null,
      assigneeName: d.assignee?.name ?? null,
    })),
    history: toHistoryEntries(history),
    form: {
      id: shoot.id,
      clientId: shoot.clientId,
      title: shoot.title,
      date: toDateKey(shoot.date),
      startTime: shoot.startTime ?? "",
      endTime: shoot.endTime ?? "",
      location: shoot.location ?? "",
      ownerId: shoot.ownerId ?? "",
      shootType: shoot.shootType ?? "",
      notes: shoot.notes ?? "",
      projectId: shoot.projectId ?? "",
      participantIds: shoot.participants.map((p) => p.userId),
      createEditingDemand: false,
    },
  };

  return (
    <ShootDetailView
      data={data}
      canWrite={canWrite}
      canCreateDemand={hasPermission(user.permissions, "demands.create")}
      users={options.users}
      projects={projects}
      currentUserId={user.id}
    />
  );
}
