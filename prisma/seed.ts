import {
  BoardListType,
  ClientStatus,
  ContractStatus,
  DemandOrigin,
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
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  PERMISSION_CODES,
  PERMISSION_LABELS,
  type PermissionCode,
} from "../lib/permissions/codes";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Samps@2026";

function daysAgo(days: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
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

  const baixa = priorityByName.get("Baixa")!;
  const media = priorityByName.get("Média")!;
  const alta = priorityByName.get("Alta")!;
  const urgente = priorityByName.get("Urgente")!;

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
      // Cliente externo enxerga apenas a própria empresa.
      { userId: clienteExterno.id, clientId: bella.id, linkType: LinkType.USER_CLIENT },
    ],
  });

  console.log("Criando quadro e portal do cliente externo…");
  const now = new Date();
  const bellaBoard = await prisma.clientBoard.create({
    data: {
      clientId: bella.id,
      name: `Quadro ${bella.name}`,
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
    include: { competences: true },
  });

  await prisma.clientBoard.update({
    where: { id: bellaBoard.id },
    data: { currentCompetenceId: bellaBoard.competences[0]?.id },
  });

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

  type SeedDemand = {
    title: string;
    description?: string;
    type: DemandType;
    origin?: DemandOrigin;
    status: DemandStatus;
    priorityId: string;
    sectorId: string | null;
    contentTypeId?: string | null;
    clientId: string;
    assigneeId?: string | null;
    requesterId?: string | null;
    materialUrl?: string | null;
    publishedUrl?: string | null;
    visibleToClient?: boolean;
    deliveryDate?: Date | null;
    publishDate?: Date | null;
    createdAt: Date;
    dueDate: Date | null;
    updatedAt?: Date;
  };

  const estatico = contentTypeBySlug.get("estatico")!.id;
  const carrossel = contentTypeBySlug.get("carrossel")!.id;
  const stories = contentTypeBySlug.get("stories")!.id;
  const reels = contentTypeBySlug.get("reels")!.id;

  const demands: SeedDemand[] = [
    // ── Briefing em aberto — quadro da Social ──────────────────────────────
    {
      title: "Carrossel — cuidados pós-clareamento",
      type: DemandType.FEED,
      status: DemandStatus.PENDING_PLANNING,
      priorityId: alta.id,
      sectorId: null,
      contentTypeId: carrossel,
      clientId: sorriso.id,
      requesterId: socialMedia.id,
      createdAt: daysAgo(1),
      dueDate: daysFromNow(5),
    },
    {
      title: "Stories — agenda da semana",
      type: DemandType.STORY,
      status: DemandStatus.OPEN,
      priorityId: media.id,
      sectorId: social.id,
      contentTypeId: stories,
      clientId: sorriso.id,
      requesterId: socialMedia.id,
      createdAt: daysAgo(2),
      dueDate: daysFromNow(2),
    },
    {
      title: "Feed — promoção harmonização",
      type: DemandType.FEED,
      status: DemandStatus.PENDING_PLANNING,
      priorityId: media.id,
      sectorId: null,
      contentTypeId: estatico,
      clientId: bella.id,
      requesterId: socialMedia.id,
      createdAt: daysAgo(0, 9),
      dueDate: daysFromNow(7),
    },

    // ── Demandado / disponível — fila do Design ────────────────────────────
    {
      title: "Carrossel institucional Bella",
      description: "Tom clean, rosa suave, 5 slides. CTA: agendar avaliação.",
      type: DemandType.FEED,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.DEMANDED,
      priorityId: alta.id,
      sectorId: design.id,
      contentTypeId: carrossel,
      clientId: bella.id,
      requesterId: socialMedia.id,
      createdAt: daysAgo(3),
      dueDate: daysFromNow(1),
    },
    {
      title: "Estático — antes e depois ortodontia",
      description: "Layout vertical 1080x1350. Sem texto excessivo.",
      type: DemandType.FEED,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.AVAILABLE,
      priorityId: media.id,
      sectorId: design.id,
      contentTypeId: estatico,
      clientId: sorriso.id,
      requesterId: socialMedia.id,
      createdAt: daysAgo(4),
      dueDate: daysFromNow(3),
    },
    {
      title: "Thumbnails YouTube — série Q3",
      description: "3 thumbs com tipografia forte.",
      type: DemandType.DESIGN,
      origin: DemandOrigin.MANAGEMENT,
      status: DemandStatus.AVAILABLE,
      priorityId: baixa.id,
      sectorId: design.id,
      clientId: bella.id,
      requesterId: gestor.id,
      createdAt: daysAgo(5),
      dueDate: daysFromNow(10),
    },

    // ── Em produção ────────────────────────────────────────────────────────
    {
      title: "Reels — rotina de higiene oral",
      description: "Hook nos 3s, CTA no final. Arte + legendas.",
      type: DemandType.REEL,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.IN_PRODUCTION,
      priorityId: urgente.id,
      sectorId: design.id,
      contentTypeId: reels,
      clientId: sorriso.id,
      assigneeId: designer.id,
      requesterId: socialMedia.id,
      createdAt: daysAgo(6),
      dueDate: daysAgo(1), // atrasada — alimenta o Painel de Gestão
    },
    {
      title: "Banner campanha Black Friday estética",
      description: "Formato feed + stories.",
      type: DemandType.DESIGN,
      origin: DemandOrigin.MANAGEMENT,
      status: DemandStatus.IN_PRODUCTION,
      priorityId: alta.id,
      sectorId: design.id,
      clientId: bella.id,
      assigneeId: designer.id,
      requesterId: gestor.id,
      createdAt: daysAgo(4, 14),
      dueDate: daysFromNow(0),
    },
    {
      title: "Edição — depoimento paciente",
      description: "Corte vertical 30–45s, legendas em PT.",
      type: DemandType.VIDEO,
      origin: DemandOrigin.VIDEO_BOARD,
      status: DemandStatus.IN_PRODUCTION,
      priorityId: media.id,
      sectorId: video.id,
      clientId: sorriso.id,
      assigneeId: videoEditor.id,
      requesterId: socialMedia.id,
      createdAt: daysAgo(5, 11),
      dueDate: daysFromNow(2),
    },

    // ── Ajuste solicitado ──────────────────────────────────────────────────
    {
      title: "Estático — pacote de limpeza",
      description: "Ajuste pedido: aumentar contraste do texto do CTA.",
      type: DemandType.FEED,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.ADJUSTMENTS,
      priorityId: alta.id,
      sectorId: design.id,
      contentTypeId: estatico,
      clientId: sorriso.id,
      assigneeId: designer.id,
      requesterId: socialMedia.id,
      materialUrl: "https://drive.google.com/demo/sorriso-limpeza",
      createdAt: daysAgo(6, 13),
      dueDate: daysFromNow(1),
      updatedAt: daysAgo(0, 11),
    },

    // ── Em revisão ─────────────────────────────────────────────────────────
    {
      title: "Carrossel — cultura organizacional",
      description: "6 slides aprovados no briefing. Material no Drive.",
      type: DemandType.FEED,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.IN_REVIEW,
      priorityId: alta.id,
      sectorId: design.id,
      contentTypeId: carrossel,
      clientId: sorriso.id,
      assigneeId: designer.id,
      requesterId: socialMedia.id,
      materialUrl: "https://drive.google.com/demo/sorriso-cultura",
      createdAt: daysAgo(7),
      dueDate: daysAgo(2),
      updatedAt: daysAgo(0, 15),
    },
    {
      title: "Stories — bastidores da clínica",
      description: "Sequência de 4 frames.",
      type: DemandType.STORY,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.IN_REVIEW,
      priorityId: media.id,
      sectorId: social.id,
      contentTypeId: stories,
      clientId: bella.id,
      assigneeId: socialMedia.id,
      requesterId: socialMedia.id,
      materialUrl: "https://drive.google.com/demo/bella-bastidores",
      visibleToClient: true,
      deliveryDate: daysFromNow(1),
      publishDate: daysFromNow(3),
      createdAt: daysAgo(3, 16),
      dueDate: daysFromNow(1),
      updatedAt: daysAgo(0, 12),
    },

    // ── Aprovado — fila da Social publicar ─────────────────────────────────
    {
      title: "Feed — lançamento linha premium",
      description: "Arte aprovada. Publicar terça 18h.",
      type: DemandType.FEED,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.APPROVED,
      priorityId: alta.id,
      sectorId: social.id,
      contentTypeId: estatico,
      clientId: bella.id,
      assigneeId: socialMedia.id,
      requesterId: socialMedia.id,
      materialUrl: "https://drive.google.com/demo/bella-premium",
      visibleToClient: true,
      deliveryDate: daysFromNow(2),
      publishDate: daysFromNow(4),
      createdAt: daysAgo(6, 9),
      dueDate: daysFromNow(1),
      updatedAt: daysAgo(1, 17),
    },
    {
      title: "Carrossel — mitos sobre clareamento",
      description: "Pronto para postagem.",
      type: DemandType.FEED,
      origin: DemandOrigin.SOCIAL_PANEL,
      status: DemandStatus.APPROVED,
      priorityId: media.id,
      sectorId: design.id,
      contentTypeId: carrossel,
      clientId: sorriso.id,
      assigneeId: designer.id,
      requesterId: socialMedia.id,
      materialUrl: "https://drive.google.com/demo/sorriso-mitos",
      visibleToClient: true,
      createdAt: daysAgo(5, 8),
      dueDate: daysFromNow(0),
      updatedAt: daysAgo(0, 18),
    },

    // ── Concluído / publicado — volume para os indicadores ─────────────────
    {
      title: "Stories — tip da semana",
      type: DemandType.STORY,
      status: DemandStatus.DONE,
      priorityId: baixa.id,
      sectorId: social.id,
      contentTypeId: stories,
      clientId: sorriso.id,
      assigneeId: socialMedia.id,
      materialUrl: "https://drive.google.com/demo/sorriso-tip",
      visibleToClient: true,
      createdAt: daysAgo(8),
      dueDate: daysAgo(4),
      updatedAt: daysAgo(3, 16),
    },
    {
      title: "Reels — bastidores Bella",
      type: DemandType.REEL,
      status: DemandStatus.PUBLISHED,
      priorityId: media.id,
      sectorId: video.id,
      contentTypeId: reels,
      clientId: bella.id,
      assigneeId: videomaker.id,
      materialUrl: "https://drive.google.com/demo/bella-reels",
      publishedUrl: "https://instagram.com/p/demo-bella-reels",
      visibleToClient: true,
      deliveryDate: daysAgo(6),
      publishDate: daysAgo(5),
      createdAt: daysAgo(9),
      dueDate: daysAgo(5),
      updatedAt: daysAgo(2, 19),
    },
    {
      title: "Feed — equipe Bella Clinic",
      type: DemandType.FEED,
      status: DemandStatus.PUBLISHED,
      priorityId: media.id,
      sectorId: design.id,
      contentTypeId: estatico,
      clientId: bella.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/bella-equipe",
      publishedUrl: "https://instagram.com/p/demo-bella-equipe",
      visibleToClient: true,
      deliveryDate: daysAgo(7),
      publishDate: daysAgo(6),
      createdAt: daysAgo(10),
      dueDate: daysAgo(6),
      updatedAt: daysAgo(1, 11),
    },
    {
      title: "Carrossel — FAQ odontológico",
      type: DemandType.FEED,
      status: DemandStatus.DONE,
      priorityId: baixa.id,
      sectorId: design.id,
      contentTypeId: carrossel,
      clientId: sorriso.id,
      assigneeId: designer.id,
      materialUrl: "https://drive.google.com/demo/sorriso-faq",
      visibleToClient: true,
      createdAt: daysAgo(11),
      dueDate: daysAgo(7),
      updatedAt: daysAgo(4, 10),
    },
    {
      title: "Stories — promoção avaliação",
      type: DemandType.STORY,
      status: DemandStatus.PUBLISHED,
      priorityId: alta.id,
      sectorId: social.id,
      contentTypeId: stories,
      clientId: bella.id,
      assigneeId: socialMedia.id,
      materialUrl: "https://drive.google.com/demo/bella-promo",
      publishedUrl: "https://instagram.com/stories/demo-promo",
      visibleToClient: true,
      deliveryDate: daysAgo(2),
      publishDate: daysAgo(1),
      createdAt: daysAgo(4, 7),
      dueDate: daysAgo(1),
      updatedAt: daysAgo(0, 20),
    },
    {
      title: "Campanha Meta Ads — captação de leads",
      description: "Criativos + copy para teste A/B.",
      type: DemandType.OTHER,
      origin: DemandOrigin.MANAGEMENT,
      status: DemandStatus.AVAILABLE,
      priorityId: alta.id,
      sectorId: trafego.id,
      clientId: bella.id,
      requesterId: gestor.id,
      createdAt: daysAgo(2, 15),
      dueDate: daysFromNow(4),
    },
  ];

  for (const demand of demands) {
    const { createdAt, updatedAt, ...rest } = demand;
    await prisma.demand.create({
      data: {
        ...rest,
        // Só o quadro da Bella existe; é dele que o portal externo lê.
        boardId: demand.clientId === bella.id ? bellaBoard.id : undefined,
        competenceId:
          demand.clientId === bella.id
            ? bellaBoard.competences[0]?.id
            : undefined,
        createdAt,
        updatedAt: updatedAt ?? createdAt,
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

  console.log("\nSeed concluído.");
  console.log(`  Permissões: ${PERMISSION_CODES.length}`);
  console.log(`  Funções: ${ROLE_DEFINITIONS.length}`);
  console.log(`  Setores: ${SECTORS.length}`);
  console.log(`  Clientes: ${sorriso.name}, ${bella.name}`);
  console.log(`  Demandas: ${demands.length}`);
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
