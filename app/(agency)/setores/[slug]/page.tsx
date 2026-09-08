import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { canReviewDemand } from "@/lib/agency/labels";
import {
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
  const collaborator = isSectorCollaborator(user.userType);
  const ownSlug = getSectorSlugForUserType(user.userType);
  /** Demo 3.4: colaborador pode olhar outras filas só em leitura. */
  const readOnly = collaborator;

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
          canAssign={!readOnly}
          canReview={!readOnly && canReviewDemand(user.userType)}
          readOnly={readOnly}
          readOnlyHint={
            readOnly
              ? ownSlug === "social"
                ? "Modo leitura no quadro geral. Use Meu painel para operar."
                : "Modo leitura (demo): você vê a fila da Social sem alterar."
              : undefined
          }
          sectorUsers={[]}
        />
      </div>
    );
  }

  const slug = params.slug as SectorSlug;

  if (!OPERATIONAL_SLUGS.has(slug)) {
    notFound();
  }

  // Colaborador sem painel (não deve ocorrer) — redireciona
  if (collaborator && !ownSlug) {
    redirect(getDashboardPath(user.userType));
  }

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
        readOnlyHint={
          readOnly
            ? ownSlug === slug
              ? "Modo leitura no quadro geral. Use Meu painel para operar."
              : `Modo leitura (demo): fila de ${copy.title.replace("Quadro Geral d", "").replace("o ", "").replace("e ", "")} só para acompanhar.`
            : undefined
        }
        sectorUsers={sectorUsers}
      />
    </div>
  );
}
