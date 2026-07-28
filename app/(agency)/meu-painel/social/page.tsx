import { requireAuth } from "@/lib/permissions/check";
import { requirePanelUserType } from "@/lib/agency/panel-access";
import { getSocialBoardData } from "@/lib/services/social-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function SocialPanelPage() {
  const user = await requireAuth();
  requirePanelUserType("social", user.userType);
  const data = await getSocialBoardData(user, { individual: true });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
      <SectorBoardView
        title="Meu painel — Social Media"
        description="Demandas, revisões e publicações dos seus clientes"
        columns={data.columns}
        grouped={data.grouped as never}
        top5={data.top5 as never}
        kpis={data.kpis}
        calendarDemands={data.calendarDemands as never}
        currentUserId={user.id}
        canAssign={false}
        sectorUsers={[]}
      />
    </div>
  );
}
