import {
  AssignmentMethod,
  BoardListType,
  ClientStatus,
  ContractStatus,
  DemandStatus,
  DemandType,
  DistributionMethod,
  LinkType,
  PortalStatus,
  PrismaClient,
  ProjectStatus,
  ShootStatus,
  UserStatus,
  UserType,
  WorkSessionStage,
  WorkSessionStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  assignmentStatusForDemandStatus,
  demandCycleViolations,
} from "../lib/agency/demand-cycle";
import {
  PERMISSION_CODES,
  PERMISSION_LABELS,
  type PermissionCode,
} from "../lib/permissions/codes";
import {
  SEED_DEMANDS,
  assertSeedDemandsFollowCycle,
  listIdForDemandType,
  operationalFieldsForSeedDemand,
  stillInBriefing,
  workSessionSecondsForTitle,
} from "./seed-demands";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Samps@2026";

function daysAgo(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(days: number, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Conjuntos de permissão por função.
 * A gestão pode reconfigurar tudo isso na UI depois — isto é só o ponto de
 * partida para que ninguém fique sem acesso no primeiro boot.
 */
const ROLE_DEFINITIONS: {
  name: string;
  description: string;
  userType: UserType;
  permissions: PermissionCode[] | "ALL";
}[] = [
  {
    name: "Administrador",
    description: "Acesso irrestrito ao sistema.",
    userType: UserType.ADMIN,
    permissions: "ALL",
  },
  {
    name: "Gestão",
    description: "Coordena a operação, a equipe e as configurações.",
    userType: UserType.MANAGEMENT,
    permissions: "ALL",
  },
  {
    name: "Social Media",
    description: "Planeja conteúdo e demanda os setores de produção.",
    userType: UserType.SOCIAL_MEDIA,
    permissions: [
      "clients.view_assigned",
      "demands.create",
      "demands.edit",
      "demands.extra_create",
      "projects.create",
      "shoots.create",
      "portal.view",
      "portal.view_as_client",
      "portal.release_info",
      "timers.view",
      "indicators.view",
      "boards.manage_lists",
    ],
  },
  {
    name: "Designer",
    description: "Executa demandas do setor de design.",
    userType: UserType.DESIGNER,
    permissions: ["clients.view_assigned", "demands.edit", "timers.view"],
  },
  {
    name: "Videomaker",
    description: "Executa captações e demandas de vídeo.",
    userType: UserType.VIDEOMAKER,
    permissions: [
      "clients.view_assigned",
      "demands.edit",
      "shoots.create",
      "timers.view",
    ],
  },
  {
    name: "Editor de Vídeo",
    description: "Executa a edição das demandas de vídeo.",
    userType: UserType.VIDEO_EDITOR,
    permissions: ["clients.view_assigned", "demands.edit", "timers.view"],
  },
  {
    name: "Colaborador",
    description: "Perfil genérico para demais colaboradores internos.",
    userType: UserType.OTHER,
    permissions: ["clients.view_assigned", "demands.edit", "timers.view"],
  },
  {
    name: "Cliente Externo",
    description: "Acesso somente ao portal da própria empresa.",
    userType: UserType.EXTERNAL_CLIENT,
    permissions: ["portal.view"],
  },
];

const SECTORS = [
  { name: "Social Media", slug: "social", color: "#8b5cf6" },
  { name: "Design", slug: "design", color: "#f97316" },
  { name: "Vídeo", slug: "video", color: "#0ea5e9" },
  { name: "Tráfego Pago", slug: "trafego", color: "#10b981" },
];

const CONTENT_TYPES = [
  { name: "Estático", slug: "estatico", sortOrder: 1 },
  { name: "Carrossel", slug: "carrossel", sortOrder: 2 },
  { name: "Stories", slug: "stories", sortOrder: 3 },
  { name: "Reels", slug: "reels", sortOrder: 4 },
  { name: "Vídeo", slug: "video", sortOrder: 5 },
  { name: "Motion", slug: "motion", sortOrder: 6 },
  // Demo 3.3 — lista oficial da Samps ainda pendente
  { name: "Reels (demo)", slug: "reels-demo", sortOrder: 20 },
  { name: "Stories em vídeo (demo)", slug: "stories-video-demo", sortOrder: 21 },
  {
    name: "Vídeo institucional (demo)",
    slug: "video-institucional-demo",
    sortOrder: 22,
  },
  { name: "Bastidores / making of (demo)", slug: "bastidores-demo", sortOrder: 23 },
  { name: "Captação bruta (demo)", slug: "captacao-bruta-demo", sortOrder: 24 },
  { name: "YouTube curto (demo)", slug: "youtube-curto-demo", sortOrder: 25 },
  { name: "Podcast — clip (demo)", slug: "podcast-clip-demo", sortOrder: 26 },
  { name: "Motion (demo)", slug: "motion-demo", sortOrder: 27 },
];

/** `weight` alimenta o cálculo do Top 5 em lib/services/priority.service.ts. */
const PRIORITY_LEVELS = [
  { name: "Baixa", color: "#64748b", weight: 1, sortOrder: 1 },
  { name: "Média", color: "#0ea5e9", weight: 2, sortOrder: 2 },
  { name: "Alta", color: "#f97316", weight: 3, sortOrder: 3 },
  { name: "Urgente", color: "#ef4444", weight: 4, sortOrder: 4 },
];

const ACTIVITY_STATUSES = [
  { name: "Pendente de planejamento", slug: "pending_planning", sortOrder: 1 },
  { name: "Em planejamento", slug: "planning", sortOrder: 2 },
  { name: "Demandado", slug: "demanded", sortOrder: 3 },
  { name: "Disponível", slug: "available", sortOrder: 4 },
  { name: "Em produção", slug: "in_production", sortOrder: 5 },
  { name: "Em revisão", slug: "in_review", sortOrder: 6 },
  { name: "Em ajuste", slug: "adjustments", sortOrder: 7 },
  { name: "Aprovado", slug: "approved", sortOrder: 8 },
  { name: "Publicado", slug: "published", sortOrder: 9, isFinal: true },
  { name: "Concluído", slug: "done", sortOrder: 10, isFinal: true },
  { name: "Cancelado", slug: "cancelled", sortOrder: 11, isFinal: true },
];

async function resetDatabase() {
  // Ordem de dependências: filhos antes dos pais.
  await prisma.priorityScore.deleteMany();
  await prisma.workPause.deleteMany();
  await prisma.workSession.deleteMany();
  await prisma.demandAssignment.deleteMany();
  await prisma.externalVisibility.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.accessAttemptLog.deleteMany();
  await prisma.shootParticipant.deleteMany();
  await prisma.shoot.deleteMany();
  await prisma.projectChecklistItem.deleteMany();
  await prisma.projectParticipant.deleteMany();
  await prisma.userProjectLink.deleteMany();
  await prisma.demand.deleteMany();
  await prisma.project.deleteMany();
  await prisma.clientPortal.deleteMany();
  await prisma.competence.deleteMany();
  await prisma.boardList.deleteMany();
  await prisma.clientBoard.deleteMany();
  await prisma.contractService.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.userClientLink.deleteMany();
  await prisma.client.deleteMany();
  await prisma.userInvite.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.userPermissionOverride.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.activityStatusConfig.deleteMany();
  await prisma.priorityLevel.deleteMany();
  await prisma.contentType.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.agencySettings.deleteMany();
}

async function main() {
  console.log("Limpando tabelas…");
  await resetDatabase();

  console.log("Criando configurações da agência…");
  await prisma.agencySettings.create({
    data: { id: "default", name: "Samps Digital" },
  });

  console.log(`Criando ${PERMISSION_CODES.length} permissões…`);
  await prisma.permission.createMany({
    data: PERMISSION_CODES.map((code) => ({
      code,
      name: PERMISSION_LABELS[code],
    })),
  });
  const permissions = await prisma.permission.findMany();
  const permissionIdByCode = new Map(permissions.map((p) => [p.code, p.id]));

  console.log("Criando funções e vínculos de permissão…");
  const roleByUserType = new Map<UserType, string>();
  for (const definition of ROLE_DEFINITIONS) {
    const codes =
      definition.permissions === "ALL"
        ? [...PERMISSION_CODES]
        : definition.permissions;

    const role = await prisma.role.create({
      data: {
        name: definition.name,
        description: definition.description,
        isSystem: true,
        permissions: {
          create: codes.map((code) => ({
            permissionId: permissionIdByCode.get(code)!,
          })),
        },
      },
    });
    roleByUserType.set(definition.userType, role.id);
  }

  console.log("Criando setores, tipos de conteúdo e prioridades…");
  await prisma.sector.createMany({
    data: SECTORS.map((s) => ({
      ...s,
      distributionMethod: DistributionMethod.MIXED,
    })),
  });
  await prisma.contentType.createMany({ data: CONTENT_TYPES });
  await prisma.priorityLevel.createMany({ data: PRIORITY_LEVELS });
  await prisma.activityStatusConfig.createMany({ data: ACTIVITY_STATUSES });

  const sectors = await prisma.sector.findMany();
  const sectorBySlug = new Map(sectors.map((s) => [s.slug, s]));
  const contentTypes = await prisma.contentType.findMany();
  const contentTypeBySlug = new Map(contentTypes.map((c) => [c.slug, c]));
  const priorities = await prisma.priorityLevel.findMany();
  const priorityByName = new Map(priorities.map((p) => [p.name, p]));

  const social = sectorBySlug.get("social")!;
  const design = sectorBySlug.get("design")!;
  const video = sectorBySlug.get("video")!;
  const trafego = sectorBySlug.get("trafego")!;

  console.log("Criando usuários…");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  async function createUser(input: {
    name: string;
    email: string;
    userType: UserType;
    sectorId?: string | null;
    jobTitle?: string;
  }) {
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        userType: input.userType,
        roleId: roleByUserType.get(input.userType)!,
        sectorId: input.sectorId ?? null,
        jobTitle: input.jobTitle,
        status: UserStatus.ACTIVE,
        // Usuários de seed já entram prontos; o fluxo de primeiro acesso é
        // exercitado pelos convites criados na UI.
        mustResetPassword: false,
        termsAcceptedAt: new Date(),
        joinedAt: daysAgo(120),
      },
    });
  }

  const admin = await createUser({
    name: "Rafael Admin",
    email: "admin@samps.digital",
    userType: UserType.ADMIN,
    jobTitle: "Administrador geral",
  });
  const gestor = await createUser({
    name: "Ana Carolina",
    email: "gestao@samps.digital",
    userType: UserType.MANAGEMENT,
    jobTitle: "Head de operações",
  });
  const socialMedia = await createUser({
    name: "Maria Souza",
    email: "social@samps.digital",
    userType: UserType.SOCIAL_MEDIA,
    sectorId: social.id,
    jobTitle: "Social media pleno",
  });
  const designer = await createUser({
    name: "João Lima",
    email: "designer@samps.digital",
    userType: UserType.DESIGNER,
    sectorId: design.id,
    jobTitle: "Designer pleno",
  });
  const videomaker = await createUser({
    name: "Pedro Rocha",
    email: "videomaker@samps.digital",
    userType: UserType.VIDEOMAKER,
    sectorId: video.id,
    jobTitle: "Videomaker",
  });
  const videoEditor = await createUser({
    name: "Luiza Martins",
    email: "editor@samps.digital",
    userType: UserType.VIDEO_EDITOR,
    sectorId: video.id,
    jobTitle: "Editora de vídeo",
  });
  const colaborador = await createUser({
    name: "Rafael Alves",
    email: "trafego@samps.digital",
    userType: UserType.OTHER,
    sectorId: trafego.id,
    jobTitle: "Gestor de tráfego",
  });
  const clienteExterno = await createUser({
    name: "Camila Ferreira",
    email: "cliente@samps.digital",
    userType: UserType.EXTERNAL_CLIENT,
    jobTitle: "Responsável de marketing",
  });

  console.log("Definindo líderes de setor…");
  await Promise.all([
    prisma.sector.update({
      where: { id: social.id },
      data: { leaderId: socialMedia.id },
    }),
    prisma.sector.update({
      where: { id: design.id },
      data: { leaderId: designer.id },
    }),
    prisma.sector.update({
      where: { id: video.id },
      data: { leaderId: videomaker.id },
    }),
    prisma.sector.update({
      where: { id: trafego.id },
      data: { leaderId: colaborador.id },
    }),
  ]);

  console.log("Criando clientes e contratos…");
  const sorriso = await prisma.client.create({
    data: {
      name: "Clínica Sorriso",
      legalName: "Clínica Sorriso Odontologia LTDA",
      segment: "Odontologia",
      email: "contato@clinicasorriso.com.br",
      status: ClientStatus.ACTIVE,
      brandColor: "#0ea5e9",
      startedAt: daysAgo(180),
      primaryResponsibleId: gestor.id,
      socialMediaId: socialMedia.id,
      accountLeaderId: gestor.id,
      contracts: {
        create: {
          planName: "Plano Essencial",
          startDate: daysAgo(180),
          status: ContractStatus.ACTIVE,
          renewalDay: 1,
          services: {
            create: [
              {
                name: "Feeds estáticos",
                quantity: 8,
                demandType: DemandType.FEED,
                contentTypeId: contentTypeBySlug.get("estatico")!.id,
              },
              {
                name: "Carrosséis",
                quantity: 4,
                demandType: DemandType.FEED,
                contentTypeId: contentTypeBySlug.get("carrossel")!.id,
              },
              {
                name: "Stories",
                quantity: 12,
                demandType: DemandType.STORY,
                contentTypeId: contentTypeBySlug.get("stories")!.id,
              },
            ],
          },
        },
      },
    },
  });

  const bella = await prisma.client.create({
    data: {
      name: "Bella Clinic",
      legalName: "Bella Clinic Estética Avançada LTDA",
      segment: "Estética",
      email: "contato@bellaclinic.com.br",
      status: ClientStatus.ACTIVE,
      brandColor: "#ec4899",
      startedAt: daysAgo(90),
      primaryResponsibleId: gestor.id,
      socialMediaId: socialMedia.id,
      externalResponsibleId: clienteExterno.id,
      contracts: {
        create: {
          planName: "Plano Performance",
          startDate: daysAgo(90),
          status: ContractStatus.ACTIVE,
          renewalDay: 5,
          services: {
            create: [
              {
                name: "Feeds estáticos",
                quantity: 12,
                demandType: DemandType.FEED,
                contentTypeId: contentTypeBySlug.get("estatico")!.id,
              },
              {
                name: "Reels",
                quantity: 6,
                demandType: DemandType.REEL,
                contentTypeId: contentTypeBySlug.get("reels")!.id,
              },
            ],
          },
        },
      },
    },
  });

  console.log("Vinculando usuários aos clientes…");
  await prisma.userClientLink.createMany({
    data: [
      { userId: socialMedia.id, clientId: sorriso.id, linkType: LinkType.USER_CLIENT },
      { userId: socialMedia.id, clientId: bella.id, linkType: LinkType.USER_CLIENT },
      { userId: designer.id, clientId: sorriso.id, linkType: LinkType.USER_CLIENT },
      { userId: designer.id, clientId: bella.id, linkType: LinkType.USER_CLIENT },
      { userId: videomaker.id, clientId: bella.id, linkType: LinkType.USER_CLIENT },
      { userId: videoEditor.id, clientId: sorriso.id, linkType: LinkType.USER_CLIENT },
      { userId: colaborador.id, clientId: bella.id, linkType: LinkType.USER_CLIENT },
      { userId: gestor.id, clientId: sorriso.id, linkType: LinkType.USER_CLIENT },
      { userId: gestor.id, clientId: bella.id, linkType: LinkType.USER_CLIENT },
      // Cliente externo enxerga apenas a própria empresa.
      { userId: clienteExterno.id, clientId: bella.id, linkType: LinkType.USER_CLIENT },
    ],
  });

  console.log("Criando quadros e portal do cliente externo…");
  const now = new Date();

  async function createOperationalBoard(client: {
    id: string;
    name: string;
  }) {
    const board = await prisma.clientBoard.create({
      data: {
        clientId: client.id,
        name: `Quadro ${client.name}`,
        createdById: gestor.id,
        designSectorId: design.id,
        videoSectorId: video.id,
        lists: {
          create: [
            { name: "Feeds", type: BoardListType.FEEDS, sortOrder: 1 },
            { name: "Stories", type: BoardListType.STORIES, sortOrder: 2 },
            { name: "Acompanhamento", type: BoardListType.FOLLOW_UP, sortOrder: 3 },
            { name: "Extras", type: BoardListType.EXTRA, sortOrder: 4 },
          ],
        },
        competences: {
          create: {
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          },
        },
      },
      include: { competences: true, lists: true },
    });

    await prisma.clientBoard.update({
      where: { id: board.id },
      data: { currentCompetenceId: board.competences[0]?.id },
    });

    return board;
  }

  const bellaBoard = await createOperationalBoard(bella);
  const sorrisoBoard = await createOperationalBoard(sorriso);

  await prisma.clientPortal.create({
    data: {
      clientId: bella.id,
      boardId: bellaBoard.id,
      displayName: bella.name,
      status: PortalStatus.ACTIVE,
      primaryColor: bella.brandColor,
      agencyContactName: gestor.name,
      agencyContactUserId: gestor.id,
      config: {
        calendarEnabled: true,
        completedVisible: true,
        upcomingVisible: true,
      },
    },
  });

  console.log("Criando demandas…");
  assertSeedDemandsFollowCycle();

  function atOffset(days: number, hour = 10, minute = 0) {
    if (days <= 0) return daysAgo(-days, hour, minute);
    return daysFromNow(days, hour);
  }

  const userIdByKey = {
    social: socialMedia.id,
    gestor: gestor.id,
    designer: designer.id,
    videomaker: videomaker.id,
    editor: videoEditor.id,
    trafego: colaborador.id,
  } as const;
  const sectorIdByKey = {
    design: design.id,
    video: video.id,
    trafego: trafego.id,
  } as const;
  const boardByClient = {
    bella: bellaBoard,
    sorriso: sorrisoBoard,
  } as const;
  const clientByKey = {
    bella,
    sorriso,
  } as const;

  let sortOrder = 0;
  for (const demand of SEED_DEMANDS) {
    const client = clientByKey[demand.clientKey];
    const board = boardByClient[demand.clientKey];
    const requesterId = userIdByKey[demand.requesterKey];
    const assigneeId = demand.assigneeKey
      ? userIdByKey[demand.assigneeKey]
      : null;
    const sectorId = demand.sectorKey ? sectorIdByKey[demand.sectorKey] : null;
    const contentTypeId = demand.contentTypeSlug
      ? contentTypeBySlug.get(demand.contentTypeSlug)?.id ?? null
      : null;
    if (demand.contentTypeSlug && !contentTypeId) {
      throw new Error(
        `Tipo de conteúdo não encontrado no seed: ${demand.contentTypeSlug}`
      );
    }
    const priority = priorityByName.get(demand.priorityName);
    if (!priority) {
      throw new Error(`Prioridade não encontrada: ${demand.priorityName}`);
    }

    const ops = operationalFieldsForSeedDemand(demand, assigneeId);
    const briefingLocked = !stillInBriefing(demand.status);
    const createdAt = atOffset(demand.createdAtOffsetDays, 9);
    const dueDate =
      demand.dueDateOffsetDays == null
        ? null
        : atOffset(demand.dueDateOffsetDays, 18);
    const productionStartedAt =
      demand.productionStartedOffsetDays == null
        ? null
        : atOffset(demand.productionStartedOffsetDays, 11);
    const productionCompletedAt =
      demand.productionCompletedOffsetDays == null
        ? null
        : atOffset(demand.productionCompletedOffsetDays, 16);
    const publishedAt =
      demand.publishedOffsetDays == null
        ? null
        : atOffset(demand.publishedOffsetDays, 18);
    const deliveryDate =
      demand.deliveryOffsetDays == null
        ? null
        : atOffset(demand.deliveryOffsetDays, 12);
    const publishDate =
      demand.publishDateOffsetDays == null
        ? null
        : atOffset(demand.publishDateOffsetDays, 18);

    const gaps = demandCycleViolations({
      status: demand.status,
      boardColumn: ops.boardColumn,
      title: demand.title,
      briefingLockedAt: briefingLocked ? createdAt : null,
      description: demand.description,
      format: demand.format,
      orientation: demand.orientation,
      durationSeconds: demand.durationSeconds,
      demandType: demand.type,
      contentTypeSlug: demand.contentTypeSlug,
      sectorId,
      assigneeId,
      materialUrl: demand.materialUrl,
      publishedUrl: demand.publishedUrl,
      visibleToClient: demand.visibleToClient,
    });
    if (gaps.length) {
      throw new Error(
        `Seed demanda "${demand.title}" fora do ciclo: ${gaps.join("; ")}`
      );
    }

    await prisma.demand.create({
      data: {
        title: demand.title,
        description: demand.description,
        type: demand.type,
        origin: demand.origin,
        status: demand.status,
        format: demand.format,
        priorityId: priority.id,
        sectorId,
        contentTypeId,
        clientId: client.id,
        assigneeId,
        requesterId,
        materialUrl: demand.materialUrl ?? null,
        publishedUrl: demand.publishedUrl ?? null,
        visibleToClient: demand.visibleToClient ?? false,
        durationSeconds: demand.durationSeconds ?? null,
        orientation: demand.orientation ?? null,
        boardId: board.id,
        competenceId: board.competences[0]?.id,
        listId: listIdForDemandType(demand.type, board.lists),
        boardColumn: ops.boardColumn,
        internalStatus: ops.internalStatus,
        externalStatus: briefingLocked
          ? demand.status === DemandStatus.PUBLISHED
            ? "Publicado"
            : "Em preparação"
          : null,
        briefingLockedAt: briefingLocked ? createdAt : null,
        briefingLockedById: briefingLocked ? requesterId : null,
        dueDate,
        createdAt,
        updatedAt: productionCompletedAt ?? productionStartedAt ?? createdAt,
        productionStartedAt,
        productionCompletedAt,
        publishedAt,
        deliveryDate,
        publishDate,
        sortOrder,
      },
    });
    sortOrder += 1;
  }

  console.log("Criando sessões de trabalho…");

  const seededDemands = await prisma.demand.findMany({
    where: { productionCompletedAt: { not: null }, assigneeId: { not: null } },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      productionCompletedAt: true,
    },
  });

  for (const demand of seededDemands) {
    const seconds = workSessionSecondsForTitle(demand.title);
    if (!seconds || !demand.assigneeId || !demand.productionCompletedAt) continue;

    const endedAt = demand.productionCompletedAt;
    const startedAt = new Date(endedAt.getTime() - seconds * 1000);
    await prisma.workSession.create({
      data: {
        demandId: demand.id,
        userId: demand.assigneeId,
        stage: WorkSessionStage.PRODUCTION,
        status: WorkSessionStatus.COMPLETED,
        startedAt,
        endedAt,
        totalActiveSeconds: seconds,
      },
    });
  }

  const limpeza = seededDemands.find(
    (d) => d.title === "Post estático limpeza de pele"
  );
  const makingOf = seededDemands.find(
    (d) => d.title === "Vídeo making of da clínica"
  );

  if (limpeza?.assigneeId && limpeza.productionCompletedAt) {
    await prisma.workSession.create({
      data: {
        demandId: limpeza.id,
        userId: limpeza.assigneeId,
        stage: WorkSessionStage.ADJUSTMENT,
        status: WorkSessionStatus.COMPLETED,
        startedAt: daysAgo(0, 10),
        endedAt: daysAgo(0, 10, 25),
        totalActiveSeconds: 1500,
      },
    });
  }

  if (makingOf?.assigneeId) {
    await prisma.workSession.create({
      data: {
        demandId: makingOf.id,
        userId: makingOf.assigneeId,
        stage: WorkSessionStage.ADJUSTMENT,
        status: WorkSessionStatus.COMPLETED,
        startedAt: daysAgo(1, 14),
        endedAt: daysAgo(1, 15),
        totalActiveSeconds: 2100,
      },
    });
  }

  console.log("Criando atribuições de setor…");

  const sectorDemands = await prisma.demand.findMany({
    where: { sectorId: { not: null } },
    select: {
      id: true,
      sectorId: true,
      status: true,
      assigneeId: true,
      requesterId: true,
    },
  });

  for (const d of sectorDemands) {
    if (!d.sectorId) continue;

    const assignmentStatus = assignmentStatusForDemandStatus(d.status, {
      assigneeId: d.assigneeId,
    });
    if (!assignmentStatus) continue;

    await prisma.demandAssignment.create({
      data: {
        demandId: d.id,
        sectorId: d.sectorId,
        executorId: d.assigneeId,
        assignedById: d.requesterId ?? gestor.id,
        status: assignmentStatus,
        method: d.assigneeId
          ? AssignmentMethod.SELF
          : AssignmentMethod.MANAGEMENT,
      },
    });
  }

  console.log("Criando projetos e captações…");

  await prisma.project.create({
    data: {
      clientId: sorriso.id,
      title: "Reposicionamento de marca",
      description: "Nova identidade visual e revisão de comunicação.",
      ownerId: gestor.id,
      status: ProjectStatus.ACTIVE,
      progress: 45,
      startDate: daysAgo(20),
      dueDate: daysFromNow(25),
      checklist: {
        create: [
          { title: "Diagnóstico de marca", isDone: true, sortOrder: 1 },
          { title: "Moodboard aprovado", isDone: true, sortOrder: 2 },
          { title: "Manual de marca", isDone: false, sortOrder: 3 },
        ],
      },
      participants: {
        create: [{ userId: designer.id }, { userId: socialMedia.id }],
      },
    },
  });

  await prisma.project.create({
    data: {
      clientId: bella.id,
      title: "Campanha de verão",
      description: "Série de conteúdos para a alta temporada.",
      ownerId: socialMedia.id,
      status: ProjectStatus.PLANNING,
      progress: 10,
      startDate: daysFromNow(3),
      dueDate: daysFromNow(45),
      participants: { create: [{ userId: videomaker.id }] },
    },
  });

  await prisma.shoot.createMany({
    data: [
      {
        clientId: bella.id,
        title: "Captação institucional",
        date: daysFromNow(5),
        startTime: "09:00",
        endTime: "13:00",
        location: "Sede Bella Clinic",
        ownerId: videomaker.id,
        shootType: "Institucional",
        status: ShootStatus.CONFIRMED,
      },
      {
        clientId: sorriso.id,
        title: "Depoimentos de pacientes",
        date: daysFromNow(12),
        startTime: "14:00",
        endTime: "18:00",
        location: "Clínica Sorriso — Unidade Centro",
        ownerId: videomaker.id,
        shootType: "Depoimentos",
        status: ShootStatus.SCHEDULED,
      },
      {
        clientId: bella.id,
        title: "Banco de imagens — procedimentos",
        date: daysAgo(8),
        startTime: "10:00",
        endTime: "12:00",
        location: "Estúdio Samps",
        ownerId: videomaker.id,
        shootType: "Fotografia",
        status: ShootStatus.COMPLETED,
      },
    ],
  });

  const { syncDemandDelays } = await import("../lib/services/delay.service");
  await syncDemandDelays();

  // Anexos Drive demo (visíveis no portal) — fatia 3.2 provisória
  const publishedWithMaterial = await prisma.demand.findMany({
    where: { materialUrl: { not: null }, visibleToClient: true },
    select: { id: true, clientId: true, title: true, materialUrl: true },
    take: 6,
  });
  if (publishedWithMaterial.length) {
    await prisma.attachment.createMany({
      data: publishedWithMaterial.map((d) => ({
        demandId: d.id,
        clientId: d.clientId,
        name: `Material — ${d.title.slice(0, 48)} (demo)`,
        url: d.materialUrl!,
        fileType: "link",
        visibleToClient: true,
        entityType: "Demand",
        entityId: d.id,
      })),
    });
  }

  const { recalculateSectorPriorities } = await import(
    "../lib/services/priority.service"
  );
  for (const sector of await prisma.sector.findMany({ select: { id: true } })) {
    await recalculateSectorPriorities(sector.id);
  }

  console.log("\nSeed concluído.");
  console.log(`  Permissões: ${PERMISSION_CODES.length}`);
  console.log(`  Funções: ${ROLE_DEFINITIONS.length}`);
  console.log(`  Setores: ${SECTORS.length}`);
  console.log(`  Clientes: ${sorriso.name}, ${bella.name}`);
  console.log(`  Demandas: ${SEED_DEMANDS.length}`);
  console.log(`\n  Senha de todos os usuários: ${DEFAULT_PASSWORD}`);
  console.log("  Logins disponíveis:");
  for (const u of [
    admin,
    gestor,
    socialMedia,
    designer,
    videomaker,
    videoEditor,
    colaborador,
    clienteExterno,
  ]) {
    console.log(`    ${u.userType.padEnd(16)} ${u.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
