import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { requirePanelUserType } from "@/lib/agency/panel-access";
import { canReviewDemand } from "@/lib/agency/labels";
import {
  getSectorBoardData,
  getSectorBySlug,
  listSectorUsers,
} from "@/lib/services/sector-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function DesignPanelPage() {
  const user = await requireAuth();
  requirePanelUserType("design", user.userType);

  const sector = await getSectorBySlug("design");
  if (!sector) throw new Error("Setor design não encontrado");

  const leaderFullView = sector.leaderId === user.id;
  const data = await getSectorBoardData("design", {
    mode: "collaborator",
    userId: user.id,
    leaderFullView,
  });

  const sectorUsers = await listSectorUsers(sector.id);
  const canAssign =
    hasPermission(user.permissions, "demands.assign") || leaderFullView;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
      <SectorBoardView
        title="Meu painel — Design"
        description={
          leaderFullView
            ? "Fila completa do setor"
            : "Suas demandas e fila disponível do setor"
        }
        columns={data.columns}
        grouped={data.grouped as never}
        top5={data.top5 as never}
        kpis={data.kpis}
        calendarDemands={data.calendarDemands as never}
        currentUserId={user.id}
        canAssign={canAssign}
        canReview={canReviewDemand(user.userType)}
        sectorUsers={sectorUsers}
      />
    </div>
  );
}
