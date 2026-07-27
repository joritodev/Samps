import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  getSectorBoardData,
  listSectorUsers,
} from "@/lib/services/sector-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function DesignPanelPage() {
  const user = await requireAuth();
  const data = await getSectorBoardData("design", { assigneeId: user.id });
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign = hasPermission(user.permissions, "demands.assign");

  return (
    <SectorBoardView
      title="Meu Painel — Design"
      description="Demandas atribuídas ou assumidas por você"
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
