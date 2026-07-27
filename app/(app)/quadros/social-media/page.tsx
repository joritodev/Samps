import { requireAuth } from "@/lib/permissions/check";
import { getSocialBoardData } from "@/lib/services/social-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function SocialMediaBoardPage() {
  const user = await requireAuth();
  const data = await getSocialBoardData(user, { individual: false });

  return (
    <SectorBoardView
      title="Quadro Geral da Social Media"
      description="Demandas, revisões, publicações e extras dos clientes"
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
