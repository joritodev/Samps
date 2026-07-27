import { ScheduleView } from "@/components/agency/schedule-view";
import { SHOOT_STATUS_LABEL } from "@/lib/agency/labels";
import { requireAuth } from "@/lib/permissions/check";
import { listShoots } from "@/lib/services/shoots.service";

export default async function CaptacoesPage() {
  const user = await requireAuth();
  const shoots = await listShoots(user);

  return (
    <ScheduleView
      title="Captações"
      description="Gravações e sessões de foto agendadas"
      dateLabel="Data"
      emptyMessage="Nenhuma captação agendada"
      items={shoots.map((shoot) => ({
        id: shoot.id,
        title: shoot.title,
        clientName: shoot.client.name,
        date: shoot.date.toISOString(),
        status: shoot.status,
        statusLabel: SHOOT_STATUS_LABEL[shoot.status],
        meta: [
          shoot.startTime && shoot.endTime
            ? `${shoot.startTime}–${shoot.endTime}`
            : shoot.startTime,
          shoot.location,
          shoot.participants.length
            ? `Equipe: ${shoot.participants.map((p) => p.user.name).join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }))}
    />
  );
}
