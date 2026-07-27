import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  getSectorBoardData,
  listSectorUsers,
} from "@/lib/services/sector-board.service";
import { listShoots } from "@/lib/services/shoots.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function VideoBoardPage() {
  const user = await requireAuth();
  const [data, shoots] = await Promise.all([
    getSectorBoardData("video"),
    listShoots(user),
  ]);
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign =
    hasPermission(user.permissions, "demands.assign") ||
    data.sector.leaderId === user.id;

  return (
    <SectorBoardView
      title="Quadro Geral do Vídeo"
      description="Produção de vídeo, reels e captações"
      columns={data.columns}
      grouped={data.grouped as never}
      top5={data.top5 as never}
      kpis={data.kpis}
      calendarDemands={data.calendarDemands as never}
      currentUserId={user.id}
      canAssign={canAssign}
      sectorUsers={sectorUsers}
      shoots={shoots.map((s) => ({
        id: s.id,
        title: s.title,
        date: s.date,
        client: s.client,
      }))}
    />
  );
}
