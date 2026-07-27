import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  getSectorBoardData,
  listSectorUsers,
} from "@/lib/services/sector-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function TrafegoBoardPage() {
  const user = await requireAuth();
  const data = await getSectorBoardData("trafego");
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign =
    hasPermission(user.permissions, "demands.assign") ||
    data.sector.leaderId === user.id;

  return (
    <SectorBoardView
      title="Quadro Geral do Tráfego Pago"
      description="Campanhas, otimizações e relatórios de mídia"
      columns={data.columns}
      grouped={data.grouped as never}
      top5={data.top5 as never}
      kpis={data.kpis}
      calendarDemands={data.calendarDemands as never}
      currentUserId={user.id}
      canAssign={canAssign}
      sectorUsers={sectorUsers}
    />
  );
}
