import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  getSectorBoardData,
  listSectorUsers,
  type SectorSlug,
} from "@/lib/services/sector-board.service";
import { getSocialBoardData } from "@/lib/services/social-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";
import { getDashboardPath, isSectorCollaborator } from "@/types/auth";

const OPERATIONAL_SLUGS = new Set<SectorSlug>(["design", "video", "trafego"]);

const TITLES: Record<SectorSlug, { title: string; description: string }> = {
  design: {
    title: "Quadro Geral do Design",
    description: "Demandas disponíveis e em produção do setor de design",
  },
  video: {
    title: "Quadro Geral de Vídeo",
    description: "Demandas disponíveis e em produção do setor de vídeo",
  },
  trafego: {
    title: "Quadro Geral de Tráfego",
    description: "Demandas disponíveis e em produção do setor de tráfego",
  },
};

export default async function SectorBoardPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await requireAuth();

  if (isSectorCollaborator(user.userType)) {
    redirect(getDashboardPath(user.userType));
  }

  if (params.slug === "social") {
    const data = await getSocialBoardData(user, { individual: false });
    return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
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
    </div>
    );
  }

  const slug = params.slug as SectorSlug;

  if (!OPERATIONAL_SLUGS.has(slug)) {
    notFound();
  }

  const data = await getSectorBoardData(slug);
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign =
    hasPermission(user.permissions, "demands.assign") ||
    data.sector.leaderId === user.id;
  const canChangeDeadline = hasPermission(
    user.permissions,
    "demands.change_deadline"
  );
  const copy = TITLES[slug];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
      <SectorBoardView
        title={copy.title}
        description={copy.description}
        columns={data.columns}
        grouped={data.grouped as never}
        top5={data.top5 as never}
        kpis={data.kpis}
        calendarDemands={data.calendarDemands as never}
        currentUserId={user.id}
        canAssign={canAssign}
        canChangeDeadline={canChangeDeadline}
        sectorUsers={sectorUsers}
      />
    </div>
  );
}
