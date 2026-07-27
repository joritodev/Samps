import {
  AuditAction,
  BoardListType,
  BoardStatus,
  CompetenceStatus,
  DemandOrigin,
  DemandStatus,
  DemandType,
  NotificationType,
  PortalStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";
import {
  DEFAULT_BOARD_LISTS,
  type BoardWizardInput,
} from "@/types/board";

function padIndex(n: number, total: number) {
  const width = String(total).length;
  return String(n).padStart(width, "0");
}

function serviceToListType(demandType: DemandType): BoardListType {
  switch (demandType) {
    case "FEED":
    case "REEL":
    case "DESIGN":
      return "FEEDS";
    case "STORY":
      return "STORIES";
    default:
      return "FEEDS";
  }
}

function formatCardTitle(name: string, index: number, total: number, month: number) {
  const mm = String(month).padStart(2, "0");
  return `${name} ${padIndex(index, total)}/${padIndex(total, total)} — ${mm}`;
}

export async function getActiveBoardByClientId(clientId: string) {
  return db.clientBoard.findUnique({
    where: { clientId },
    include: {
      client: true,
      contract: { include: { services: true } },
      lists: { orderBy: { sortOrder: "asc" } },
      portal: true,
      competences: { orderBy: [{ year: "desc" }, { month: "desc" }] },
    },
  });
}

export async function generateContractualCards(params: {
  boardId: string;
  clientId: string;
  competenceId: string;
  contractId: string;
  month: number;
  userId?: string;
}) {
  const { boardId, clientId, competenceId, contractId, month, userId } = params;
  const [services, lists] = await Promise.all([
    db.contractService.findMany({ where: { contractId, isActive: true } }),
    db.boardList.findMany({ where: { boardId, active: true } }),
  ]);

  const listByType = Object.fromEntries(lists.map((l) => [l.type, l]));
  const cardData: Prisma.DemandCreateManyInput[] = [];

  for (const service of services) {
    const qty = service.quantity ?? 0;
    if (qty <= 0) continue;
    const demandType = service.demandType ?? DemandType.FEED;
    const listType = serviceToListType(demandType);
    const list = listByType[listType];
    if (!list) continue;

    for (let i = 1; i <= qty; i++) {
      cardData.push({
        clientId,
        boardId,
        listId: list.id,
        competenceId,
        contractServiceId: service.id,
        title: formatCardTitle(service.name, i, qty, month),
        type: demandType,
        origin: DemandOrigin.CLIENT_BOARD,
        format: service.name,
        status: DemandStatus.PENDING_PLANNING,
        internalStatus: "Pendente de planejamento",
        externalStatus: "Planejamento",
        boardColumn: list.type.toLowerCase(),
        cardCode: `${demandType}-${month}-${padIndex(i, qty)}`,
        cardIndex: i,
        cardTotalInType: qty,
        isContractual: true,
        visibleToClient: false,
      });
    }
  }

  if (cardData.length > 0) {
    await db.demand.createMany({ data: cardData });
  }

  if (userId && cardData.length > 0) {
    await logAudit({
      userId,
      action: AuditAction.CARD_AUTO_CREATED,
      entityType: "Competence",
      entityId: competenceId,
      newValue: { count: cardData.length, competenceId },
    });
  }

  return cardData.map((_, i) => String(i));
}

export async function createClientBoardTransaction(input: BoardWizardInput) {
  const result = await db.$transaction(async (tx) => {
    if (input.clientId) {
      const existing = await tx.clientBoard.findUnique({
        where: { clientId: input.clientId },
      });
      if (existing?.status === BoardStatus.ACTIVE) {
        throw new Error("Este cliente já possui um quadro interno ativo.");
      }
    }

    let clientId = input.clientId;

    if (clientId) {
      await tx.client.update({
        where: { id: clientId },
        data: {
          name: input.client.name,
          legalName: input.client.legalName,
          tradeName: input.client.tradeName,
          segment: input.client.segment,
          email: input.client.email,
          phone: input.client.phone,
          logoUrl: input.client.logoUrl,
          brandColor: input.client.brandColor,
          startedAt: input.client.startedAt,
          internalNotes: input.client.internalNotes,
          socialMediaId: input.team.socialMediaId,
          secondarySocialMediaId: input.team.secondarySocialMediaId,
          primaryResponsibleId: input.team.primaryResponsibleId,
          accountLeaderId: input.team.accountLeaderId,
        },
      });
    } else {
      const client = await tx.client.create({
        data: {
          name: input.client.name,
          legalName: input.client.legalName,
          tradeName: input.client.tradeName,
          segment: input.client.segment,
          email: input.client.email,
          phone: input.client.phone,
          logoUrl: input.client.logoUrl,
          brandColor: input.client.brandColor,
          startedAt: input.client.startedAt,
          internalNotes: input.client.internalNotes,
          socialMediaId: input.team.socialMediaId,
          secondarySocialMediaId: input.team.secondarySocialMediaId,
          primaryResponsibleId: input.team.primaryResponsibleId,
          accountLeaderId: input.team.accountLeaderId,
        },
      });
      clientId = client.id;
    }

    const contract = await tx.contract.create({
      data: {
        clientId,
        planName: input.contract.planName,
        startDate: input.contract.startDate,
        endDate: input.contract.endDate,
        renewalDay: input.contract.renewalDay,
        initialCompetenceMonth: input.contract.competenceMonth,
        initialCompetenceYear: input.contract.competenceYear,
        notes: input.contract.notes,
        services: {
          create: input.contract.services.map((s) => ({
            name: s.name,
            quantity: s.quantity,
            demandType: s.demandType,
            isActive: true,
          })),
        },
      },
      include: { services: true },
    });

    const board = await tx.clientBoard.create({
      data: {
        clientId,
        name: `Quadro — ${input.client.tradeName ?? input.client.name}`,
        contractId: contract.id,
        designSectorId: input.team.designSectorId,
        videoSectorId: input.team.videoSectorId,
        createdById: input.createdById,
        config: { lists: input.lists },
      },
    });

    const lists = await Promise.all(
      DEFAULT_BOARD_LISTS.filter((l) => input.lists[l.type] !== false).map((l) =>
        tx.boardList.create({
          data: {
            boardId: board.id,
            name: l.name,
            type: l.type,
            sortOrder: l.sortOrder,
            active: true,
          },
        })
      )
    );

    const competence = await tx.competence.create({
      data: {
        boardId: board.id,
        month: input.contract.competenceMonth,
        year: input.contract.competenceYear,
        status: CompetenceStatus.OPEN,
      },
    });

    await tx.clientBoard.update({
      where: { id: board.id },
      data: { currentCompetenceId: competence.id },
    });

    const portal = await tx.clientPortal.create({
      data: {
        clientId,
        boardId: board.id,
        displayName: input.portal.displayName,
        logoUrl: input.portal.logoUrl ?? input.client.logoUrl,
        primaryColor: input.portal.primaryColor ?? input.client.brandColor,
        status: input.portal.status ?? PortalStatus.DRAFT,
        agencyContactName: input.portal.agencyContactName,
        agencyContactUserId: input.portal.agencyContactUserId,
        config: {
          calendarEnabled: input.portal.calendarEnabled,
          completedVisible: input.portal.completedVisible,
          upcomingVisible: input.portal.upcomingVisible,
        },
      },
    });

    await tx.userClientLink.upsert({
      where: {
        userId_clientId: {
          userId: input.team.socialMediaId,
          clientId,
        },
      },
      update: { isActive: true },
      create: { userId: input.team.socialMediaId, clientId },
    });

    const listByType = Object.fromEntries(lists.map((l) => [l.type, l]));
    const cardData: Prisma.DemandCreateManyInput[] = [];

    for (const service of contract.services) {
      const qty = service.quantity ?? 0;
      if (qty <= 0) continue;
      const demandType = service.demandType ?? DemandType.FEED;
      const listType = serviceToListType(demandType);
      const list = listByType[listType];
      if (!list) continue;

      for (let i = 1; i <= qty; i++) {
        cardData.push({
          clientId,
          boardId: board.id,
          listId: list.id,
          competenceId: competence.id,
          contractServiceId: service.id,
          title: formatCardTitle(service.name, i, qty, input.contract.competenceMonth),
          type: demandType,
          origin: DemandOrigin.CLIENT_BOARD,
          format: service.name,
          status: DemandStatus.PENDING_PLANNING,
          internalStatus: "Pendente de planejamento",
          externalStatus: "Planejamento",
          boardColumn: list.type.toLowerCase(),
          cardCode: `${demandType}-${input.contract.competenceMonth}-${padIndex(i, qty)}`,
          cardIndex: i,
          cardTotalInType: qty,
          isContractual: true,
          visibleToClient: false,
        });
      }
    }

    if (cardData.length > 0) {
      await tx.demand.createMany({ data: cardData });
    }

    return {
      clientId,
      boardId: board.id,
      portalId: portal.id,
      competenceId: competence.id,
      cardCount: cardData.length,
    };
  }, { timeout: 30_000 });

  await logAudit({
    userId: input.createdById,
    action: AuditAction.BOARD_CREATED,
    entityType: "ClientBoard",
    entityId: result.boardId,
    newValue: { clientId: result.clientId, cardCount: result.cardCount },
  });

  await logAudit({
    userId: input.createdById,
    action: AuditAction.PORTAL_CREATED,
    entityType: "ClientPortal",
    entityId: result.portalId,
    newValue: { status: PortalStatus.DRAFT },
  });

  await createNotification({
    userId: input.team.socialMediaId,
    type: NotificationType.NEW_DEMAND,
    title: "Novo quadro de cliente",
    message: `Quadro criado para ${input.client.name}`,
    link: `/clientes/${result.clientId}/quadro`,
  });

  return result;
}

export async function archiveBoard(boardId: string, userId: string) {
  return db.$transaction(async (tx) => {
    const board = await tx.clientBoard.update({
      where: { id: boardId },
      data: { status: BoardStatus.ARCHIVED },
    });
    await tx.clientPortal.updateMany({
      where: { boardId },
      data: { status: PortalStatus.ARCHIVED },
    });
    await logAudit({
      userId,
      action: AuditAction.BOARD_ARCHIVED,
      entityType: "ClientBoard",
      entityId: boardId,
    });
    return board;
  });
}

export async function getBoardKpis(boardId: string, competenceId: string) {
  const demands = await db.demand.findMany({
    where: { boardId, competenceId },
  });

  const feeds = demands.filter((d) => d.type === DemandType.FEED || d.type === DemandType.REEL || d.type === DemandType.DESIGN);
  const stories = demands.filter((d) => d.type === DemandType.STORY);
  const now = new Date();

  return {
    feedsContracted: feeds.filter((d) => d.isContractual).length,
    feedsDemanded: feeds.filter((d) => d.status === DemandStatus.DEMANDED || d.status === DemandStatus.IN_PRODUCTION).length,
    feedsPublished: feeds.filter((d) => d.status === DemandStatus.PUBLISHED || d.status === DemandStatus.DONE).length,
    storiesContracted: stories.filter((d) => d.isContractual).length,
    storiesDemanded: stories.filter((d) => d.status === DemandStatus.DEMANDED).length,
    storiesPublished: stories.filter((d) => d.status === DemandStatus.PUBLISHED).length,
    overdue: demands.filter((d) => d.dueDate && d.dueDate < now && d.status !== DemandStatus.DONE).length,
    unassigned: demands.filter((d) => !d.assigneeId && d.status !== DemandStatus.DONE).length,
    inReview: demands.filter((d) => d.status === DemandStatus.IN_REVIEW).length,
    activeProjects: await db.project.count({ where: { clientId: demands[0]?.clientId, status: "ACTIVE" } }),
  };
}

export async function groupBoardDemandsByList(
  boardId: string,
  competenceId: string,
  filters?: {
    search?: string;
    listId?: string;
    status?: string;
    visibleToClient?: boolean;
  }
) {
  const lists = await db.boardList.findMany({
    where: { boardId, active: true, ...(filters?.listId ? { id: filters.listId } : {}) },
    orderBy: { sortOrder: "asc" },
  });

  const demands = await db.demand.findMany({
    where: {
      boardId,
      competenceId,
      ...(filters?.listId ? { listId: filters.listId } : {}),
      ...(filters?.status
        ? { status: filters.status as DemandStatus }
        : {}),
      ...(filters?.visibleToClient !== undefined
        ? { visibleToClient: filters.visibleToClient }
        : {}),
      ...(filters?.search
        ? { title: { contains: filters.search, mode: "insensitive" } }
        : {}),
    },
    include: {
      client: { select: { id: true, name: true, brandColor: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      priority: { select: { id: true, name: true, color: true, weight: true } },
      list: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { cardIndex: "asc" }, { createdAt: "asc" }],
  });

  const listByType = Object.fromEntries(lists.map((l) => [l.type, l.id]));

  // Cartões sem listId (seed antigo / migração) caem na lista do tipo correspondente.
  function resolveListId(demand: (typeof demands)[number]) {
    if (demand.listId && lists.some((l) => l.id === demand.listId)) {
      return demand.listId;
    }
    const byType: Partial<Record<string, string>> = {
      FEED: listByType.FEEDS,
      REEL: listByType.FEEDS,
      DESIGN: listByType.FEEDS,
      STORY: listByType.STORIES,
      VIDEO: listByType.SHOOTS ?? listByType.FOLLOW_UP,
    };
    return byType[demand.type] ?? listByType.FOLLOW_UP ?? lists[0]?.id ?? null;
  }

  const grouped: Record<string, typeof demands> = {};
  for (const list of lists) {
    grouped[list.id] = [];
  }
  for (const demand of demands) {
    const listId = resolveListId(demand);
    if (!listId || !grouped[listId]) continue;
    grouped[listId].push({ ...demand, listId });
  }
  return { lists, grouped };
}
