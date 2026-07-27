import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  getSectorBoardData,
  listSectorUsers,
} from "@/lib/services/sector-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function TrafegoPanelPage() {
  const user = await requireAuth();
  const data = await getSectorBoardData("trafego", { assigneeId: user.id });
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign =
    hasPermission(user.permissions, "demands.assign") ||
    data.sector.leaderId === user.id;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
      <SectorBoardView
        title="Meu painel — Tráfego"
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
    </div>
  );
}
