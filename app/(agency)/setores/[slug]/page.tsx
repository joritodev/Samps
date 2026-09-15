import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { canReviewDemand } from "@/lib/agency/labels";
import {
  getSectorBySlug,
  getSectorBoardData,
  listSectorUsers,
  type SectorSlug,
} from "@/lib/services/sector-board.service";
import { getSocialBoardData } from "@/lib/services/social-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";
import {
  getDashboardPath,
  getSectorSlugForUserType,
  isSectorCollaborator,
} from "@/types/auth";

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
  const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  const ownSlug = getSectorSlugForUserType(user.userType);
  const collaborator = isSectorCollaborator(user.userType);

  const isSocial = params.slug === "social";
  const isOperational = OPERATIONAL_SLUGS.has(params.slug as SectorSlug);

  if (!isSocial && !isOperational) {
    notFound();
  }

  // Resolve sector for leader check (DB has slug "social"; type is operational-only)
  const sectorRow = await getSectorBySlug(
    (isSocial ? "social" : params.slug) as SectorSlug
  );
  const isLeader = sectorRow?.leaderId === user.id;

  if (!isMgmt && !isLeader) {
    if (collaborator) {
      redirect(
        ownSlug ? `/meu-painel/${ownSlug}` : getDashboardPath(user.userType)
      );
    }
    redirect(getDashboardPath(user.userType));
  }

  // After gate: only mgmt or leader of THIS sector reach the board
  const readOnly = false;

  if (isSocial) {
    const data = await getSocialBoardData(user, { individual: false });
    const canAssign =
      !readOnly &&
      (hasPermission(user.permissions, "demands.assign") || isLeader);
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
          canAssign={canAssign}
          canReview={!readOnly && canReviewDemand(user.userType)}
          readOnly={readOnly}
          sectorUsers={[]}
        />
      </div>
    );
  }

  const slug = params.slug as SectorSlug;
  const data = await getSectorBoardData(slug);
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign =
    !readOnly &&
    (hasPermission(user.permissions, "demands.assign") ||
      data.sector.leaderId === user.id);
  const canChangeDeadline =
    !readOnly && hasPermission(user.permissions, "demands.change_deadline");
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
        canReview={!readOnly && canReviewDemand(user.userType)}
        canChangeDeadline={canChangeDeadline}
        readOnly={readOnly}
        sectorUsers={sectorUsers}
      />
    </div>
  );
}
