import { NoBoardView, BoardView } from "@/components/board/board-view";
import { db } from "@/lib/db";
import {
  getActiveBoardByClientId,
  getBoardKpis,
  groupBoardDemandsByList,
} from "@/lib/services/board.service";
import { requireClientAccess } from "@/lib/permissions/check";
import { canCreateExtraDemand } from "@/lib/permissions/can-create-extra-demand";
import { hasPermission } from "@/lib/permissions/resolve";
import { UserStatus, UserType } from "@prisma/client";

export default async function ClienteQuadroPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: {
    competencia?: string;
    busca?: string;
    lista?: string;
    status?: string;
    visivel?: string;
  };
}) {
  const user = await requireClientAccess(params.id);
  const canManageLists = hasPermission(user.permissions, "boards.manage_lists");
  const canCreateExtra = canCreateExtraDemand(user.permissions);
  const canEditChecklist = hasPermission(user.permissions, "demands.edit");
  const loadSectorUsers = canCreateExtra || canEditChecklist;

  const board = await getActiveBoardByClientId(params.id);
  if (!board) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <NoBoardView clientId={params.id} />
      </div>
    );
  }

  const competenceId =
    searchParams.competencia ??
    board.currentCompetenceId ??
    board.competences[0]?.id;

  if (!competenceId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          Quadro sem competência mensal. Abra as configurações do quadro.
        </p>
      </div>
    );
  }

  const [{ lists, grouped }, kpis, sectors, sectorUsers] = await Promise.all([
    groupBoardDemandsByList(board.id, competenceId, {
      search: searchParams.busca,
      listId: searchParams.lista,
      status: searchParams.status,
      visibleToClient:
        searchParams.visivel === "true"
          ? true
          : searchParams.visivel === "false"
            ? false
            : undefined,
    }),
    getBoardKpis(board.id, competenceId),
    canCreateExtra
      ? db.sector.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    loadSectorUsers
      ? db.user.findMany({
          where: {
            status: UserStatus.ACTIVE,
            sectorId: { not: null },
            userType: { not: UserType.EXTERNAL_CLIENT },
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true, sectorId: true },
        })
      : Promise.resolve([]),
  ]);

  const calendarDemands = Object.values(grouped).flat();

  return (
    <BoardView
      clientId={params.id}
      boardId={board.id}
      clientName={board.client.name}
      logoUrl={board.client.logoUrl}
      brandColor={board.client.brandColor}
      contractStatus={board.contract?.status}
      socialName={undefined}
      managerName={undefined}
      competences={board.competences.map((c) => ({
        id: c.id,
        month: c.month,
        year: c.year,
        status: c.status,
      }))}
      currentCompetenceId={competenceId}
      lists={lists.map((l) => ({ id: l.id, name: l.name, type: l.type }))}
      canManageLists={canManageLists}
      canCreateExtra={canCreateExtra}
      sectors={sectors}
      sectorUsers={sectorUsers.flatMap((u) =>
        u.sectorId
          ? [{ id: u.id, name: u.name, sectorId: u.sectorId }]
          : []
      )}
      grouped={Object.fromEntries(
        Object.entries(grouped).map(([listId, demands]) => [
          listId,
          demands.map((d) => ({
            id: d.id,
            title: d.title,
            type: d.type,
            format: d.format,
            status: d.status,
            listId: d.listId,
            boardColumn: d.boardColumn ?? undefined,
            dueDate: d.dueDate,
            deliveryDate: d.deliveryDate,
            publishDate: d.publishDate,
            client: d.client,
            assignee: d.assignee,
            priority: d.priority,
            origin: d.origin ?? undefined,
          })),
        ])
      )}
      calendarDemands={calendarDemands.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        format: d.format,
        status: d.status,
        listId: d.listId,
        boardColumn: d.boardColumn ?? undefined,
        dueDate: d.dueDate,
        deliveryDate: d.deliveryDate,
        publishDate: d.publishDate,
        client: d.client,
        assignee: d.assignee,
        priority: d.priority,
        origin: d.origin ?? undefined,
      }))}
      kpis={{
        feedsContracted: kpis.feedsContracted,
        feedsDemanded: kpis.feedsDemanded,
        feedsPublished: kpis.feedsPublished,
        storiesContracted: kpis.storiesContracted,
        overdue: kpis.overdue,
        unassigned: kpis.unassigned,
      }}
    />
  );
}
