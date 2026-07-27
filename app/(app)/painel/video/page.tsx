import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  getSectorBoardData,
  listSectorUsers,
} from "@/lib/services/sector-board.service";
import { listShoots } from "@/lib/services/shoots.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function VideoPanelPage() {
  const user = await requireAuth();
  const [data, shoots] = await Promise.all([
    getSectorBoardData("video", { assigneeId: user.id }),
    listShoots(user),
  ]);
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign = hasPermission(user.permissions, "demands.assign");

  const myShoots = shoots.filter((s) =>
    s.participants?.some((p) => p.userId === user.id)
  );

  return (
    <SectorBoardView
      title="Meu Painel — Vídeo"
      description="Seus vídeos, produções e captações"
      columns={data.columns}
      grouped={data.grouped as never}
      top5={data.top5 as never}
      kpis={data.kpis}
      calendarDemands={data.calendarDemands as never}
      currentUserId={user.id}
      canAssign={canAssign}
      sectorUsers={sectorUsers}
      shoots={myShoots.map((s) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        client: s.client,
      }))}
    />
  );
}
