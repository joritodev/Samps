import { requireAuth } from "@/lib/permissions/check";
import { getSocialBoardData } from "@/lib/services/social-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function SocialMediaPanelPage() {
  const user = await requireAuth();
  const data = await getSocialBoardData(user, { individual: true });

  return (
    <SectorBoardView
      title="Meu Painel — Social Media"
      description="Suas demandas e dos clientes sob sua responsabilidade"
      columns={data.columns}
      grouped={data.grouped as never}
      top5={data.top5 as never}
      kpis={data.kpis}
      calendarDemands={data.calendarDemands as never}
      currentUserId={user.id}
      canAssign={false}
      sectorUsers={[]}
    />
  );
}
