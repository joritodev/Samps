import {
  AssignmentMethod,
  AssignmentStatus,
  CompetenceStatus,
  ContractStatus,
  DemandOrigin,
  DemandStatus,
  DemandType,
  PortalStatus,
  ProjectStatus,
  ShootStatus,
  type Prisma,
} from "@prisma/client";
import {
  assignmentStatusForDemandStatus,
  boardColumnForDemandStatus,
  demandCycleViolations,
  internalStatusForDemandStatus,
} from "@/lib/agency/demand-cycle";
import {
  buildPerformanceSummary,
  type DeliveryRow,
  type KpiKey,
} from "@/lib/agency/performance-summary";
import { DAY_MS, addDays, dayKey, endOfDayMs, startOfDayMs } from "@/lib/agency/sp-calendar";
import { createRng, type Rng } from "./rng";
import {
  ADJUSTMENT_REQUESTS,
  ADJUSTMENT_RESPONSES,
  PAUSE_REASONS,
  SIM_CLIENTS,
  SIM_EXTRAS,
  SIM_PROJECTS,
  SIM_SHOOTS,
  type ContentKind,
  type SimClientSpec,
} from "./story";
import {
  MINUTE_MS,
  addBusinessDays,
  at,
  businessDaysOfMonth,
  clampToWork,
  isBusinessDay,
  nextBusinessDay,
  takeSlots,
  type Interval,
} from "./work-calendar";

// ------------------------------------------------------------------ entrada
export type SimMember = {
  id: string;
  name: string;
  userType: string;
  sectorSlug: string | null;
};

export type PriorityName = "Baixa" | "Média" | "Alta" | "Urgente";

export type SimInput = {
  now: Date;
  seed?: number;
  /** Pessoas internas ativas. A simulação nunca cria usuários: usa só estas. */
  team: SimMember[];
  sectorIds: { social: string; design: string; video: string; trafego?: string };
  contentTypeIds: Record<string, string>;
  priorityIds: Record<PriorityName, string>;
};

// -------------------------------------------------------------------- saída
export type QuarterPlan = {
  period: { startsOn: string; endsOn: string };
  clients: Prisma.ClientCreateManyInput[];
  contracts: Prisma.ContractCreateManyInput[];
  services: Prisma.ContractServiceCreateManyInput[];
  boards: Prisma.ClientBoardCreateManyInput[];
  lists: Prisma.BoardListCreateManyInput[];
  competences: Prisma.CompetenceCreateManyInput[];
  /** Quadro → competência aberta (a FK é circular, então é gravada depois). */
  currentCompetence: { boardId: string; competenceId: string }[];
  portals: Prisma.ClientPortalCreateManyInput[];
  userClientLinks: Prisma.UserClientLinkCreateManyInput[];
  projects: Prisma.ProjectCreateManyInput[];
  projectItems: Prisma.ProjectChecklistItemCreateManyInput[];
  projectParticipants: Prisma.ProjectParticipantCreateManyInput[];
  userProjectLinks: Prisma.UserProjectLinkCreateManyInput[];
  demands: Prisma.DemandCreateManyInput[];
  assignments: Prisma.DemandAssignmentCreateManyInput[];
  sessions: Prisma.WorkSessionCreateManyInput[];
  pauses: Prisma.WorkPauseCreateManyInput[];
  delays: Prisma.DemandDelayCreateManyInput[];
  comments: Prisma.CommentCreateManyInput[];
  notifications: Prisma.NotificationCreateManyInput[];
  shoots: Prisma.ShootCreateManyInput[];
  shootParticipants: Prisma.ShootParticipantCreateManyInput[];
  meetings: Prisma.AgendaMeetingCreateManyInput[];
  announcements: Prisma.AnnouncementCreateManyInput[];
  goals: Prisma.GoalCreateManyInput[];
  objectives: Prisma.ObjectiveCreateManyInput[];
  keyResults: Prisma.KeyResultCreateManyInput[];
  checkIns: Prisma.KeyResultCheckInCreateManyInput[];
  /** Resumo para conferência: o que a simulação produziu. */
  summary: Record<string, number | string>;
};

// -------------------------------------------------------------- parâmetros
const KIND: Record<
  ContentKind,
  {
    type: DemandType;
    contentSlug: string | null;
    sector: "design" | "video" | "trafego";
    list: "FEEDS" | "STORIES" | "FOLLOW_UP" | "EXTRA";
    label: string;
    minutes: number;
    leadDays: number;
    priority: PriorityName;
    complexity: number;
    late: number;
    rework: number;
  }
> = {
  estatico: { type: DemandType.FEED, contentSlug: "estatico", sector: "design", list: "FEEDS", label: "Feed", minutes: 75, leadDays: 4, priority: "Média", complexity: 1, late: 0.15, rework: 0.2 },
  carrossel: { type: DemandType.FEED, contentSlug: "carrossel", sector: "design", list: "FEEDS", label: "Carrossel", minutes: 150, leadDays: 5, priority: "Média", complexity: 2, late: 0.2, rework: 0.3 },
  stories: { type: DemandType.STORY, contentSlug: "stories", sector: "design", list: "STORIES", label: "Stories", minutes: 25, leadDays: 3, priority: "Baixa", complexity: 1, late: 0.1, rework: 0.1 },
  reels: { type: DemandType.REEL, contentSlug: "reels", sector: "video", list: "FEEDS", label: "Reel", minutes: 180, leadDays: 7, priority: "Alta", complexity: 2, late: 0.26, rework: 0.36 },
  video: { type: DemandType.VIDEO, contentSlug: "video", sector: "video", list: "FOLLOW_UP", label: "Vídeo", minutes: 360, leadDays: 10, priority: "Alta", complexity: 3, late: 0.3, rework: 0.5 },
  trafego: { type: DemandType.OTHER, contentSlug: null, sector: "trafego", list: "FOLLOW_UP", label: "Tráfego", minutes: 240, leadDays: 4, priority: "Média", complexity: 2, late: 0.1, rework: 0.05 },
};

const NOTIFICATION_WINDOW_DAYS = 4;

// -------------------------------------------------------------------- tipos
type ClientCtx = {
  spec: SimClientSpec;
  id: string;
  boardId: string;
  contractId: string;
  requesterId: string;
  index: number;
  lists: Record<string, string>;
  competenceByMonth: Map<string, string>;
  serviceByKind: Map<ContentKind, string>;
};

type Spec = {
  id: string;
  client: ClientCtx;
  kind: ContentKind;
  title: string;
  description: string;
  contractual: boolean;
  origin: DemandOrigin;
  priority: PriorityName;
  createdAt: number;
  demandedAt: number;
  dueDay: string;
  publishDay: string;
  competenceId: string | null;
  serviceId: string | null;
  projectId: string | null;
  cardIndex: number | null;
  cardTotal: number | null;
  cardCode: string | null;
  requesterId: string;
  earliest: number;
};

const pad = (v: number) => String(v).padStart(2, "0");

function quarterStart(key: string): string {
  const month = Number(key.slice(5, 7));
  const first = Math.floor((month - 1) / 3) * 3 + 1;
  return `${key.slice(0, 4)}-${pad(first)}-01`;
}

function shiftMonths(key: string, delta: number): string {
  const d = new Date(`${key.slice(0, 7)}-01T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 10);
}

function endOfMonthKey(key: string): string {
  return addDays(shiftMonths(key, 1), -1);
}

function round(value: number, step: number) {
  return Number((Math.round(value / step) * step).toFixed(4));
}

const MONTH_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// ---------------------------------------------------------------- planejador
export function planQuarter(input: SimInput): QuarterPlan {
  const rng = createRng(input.seed ?? 20261005);
  const nowMs = input.now.getTime();
  const todayKey = dayKey(input.now);

  const currentStart = quarterStart(todayKey);
  const previousStart = shiftMonths(currentStart, -3);
  const previousEnd = addDays(currentStart, -1);
  const currentEnd = endOfMonthKey(shiftMonths(currentStart, 2));
  const firstMonth = previousStart.slice(0, 7);

  // Elenco ------------------------------------------------------------
  const team = input.team;
  const admin = team.find((m) => m.userType === "ADMIN") ?? team[0];
  const manager = team.find((m) => m.userType === "MANAGEMENT") ?? admin;
  const socials = team.filter((m) => m.userType === "SOCIAL_MEDIA");
  const designers = team.filter((m) => m.sectorSlug === "design" || m.userType === "DESIGNER");
  const videos = team.filter(
    (m) => m.sectorSlug === "video" || m.userType === "VIDEOMAKER" || m.userType === "VIDEO_EDITOR"
  );
  const traffic = team.filter((m) => m.sectorSlug === "trafego");
  const missing = [
    !admin && "um usuário administrador",
    socials.length === 0 && "um Social Media",
    designers.length === 0 && "alguém do Design",
    videos.length === 0 && "alguém do Vídeo",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`A simulação precisa de ${missing.join(", ")} ativo(s) no sistema.`);
  }
  const pool: Record<"design" | "video" | "trafego", SimMember[]> = {
    design: dedupe(designers),
    video: dedupe(videos),
    trafego: dedupe(traffic),
  };
  const hasTraffic = pool.trafego.length > 0 && Boolean(input.sectorIds.trafego);
  const videomaker = team.find((m) => m.userType === "VIDEOMAKER") ?? pool.video[0];
  const sectorId = (sector: "design" | "video" | "trafego") =>
    sector === "trafego" ? input.sectorIds.trafego! : input.sectorIds[sector];

  // Ids determinísticos ------------------------------------------------
  const counters = new Map<string, number>();
  const nextId = (kind: string) => {
    const n = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, n);
    return `sim-${kind}-${String(n).padStart(4, "0")}`;
  };

  const plan: QuarterPlan = {
    period: { startsOn: previousStart, endsOn: currentEnd },
    clients: [], contracts: [], services: [], boards: [], lists: [], competences: [],
    currentCompetence: [], portals: [], userClientLinks: [], projects: [], projectItems: [],
    projectParticipants: [], userProjectLinks: [], demands: [], assignments: [], sessions: [],
    pauses: [], delays: [], comments: [], notifications: [], shoots: [], shootParticipants: [],
    meetings: [], announcements: [], goals: [], objectives: [], keyResults: [], checkIns: [],
    summary: {},
  };

  // Meses simulados (do início do trimestre anterior até o mês de hoje) --
  const months: { year: number; month: number; key: string }[] = [];
  for (let cursor = `${firstMonth}-01`; cursor <= todayKey; cursor = shiftMonths(cursor, 1)) {
    months.push({
      year: Number(cursor.slice(0, 4)),
      month: Number(cursor.slice(5, 7)),
      key: cursor.slice(0, 7),
    });
  }
  const currentMonthKey = todayKey.slice(0, 7);

  // Clientes, contratos, quadros, competências ------------------------
  const activeSpecs = SIM_CLIENTS.filter((c) => c.startedOn <= todayKey && (c.services.length > 0));
  const clients: ClientCtx[] = activeSpecs.map((spec, index) => {
    const id = nextId("client");
    const boardId = nextId("board");
    const contractId = nextId("contract");
    const requester = socials[index % socials.length];
    const startedMs = at(spec.startedOn, 9);
    plan.clients.push({
      id,
      name: spec.name,
      legalName: spec.legalName,
      tradeName: spec.name,
      segment: spec.segment,
      email: spec.email,
      phone: spec.phone,
      addressCity: spec.city,
      addressState: "SP",
      brandColor: spec.brandColor,
      status: "ACTIVE",
      primaryResponsibleId: manager.id,
      socialMediaId: requester.id,
      accountLeaderId: manager.id,
      startedAt: new Date(startedMs),
      internalNotes: `${spec.plan}. Tom de voz: ${spec.tone}.`,
      createdAt: new Date(startedMs),
      updatedAt: new Date(startedMs),
    });
    plan.contracts.push({
      id: contractId,
      clientId: id,
      planName: spec.plan,
      startDate: new Date(startedMs),
      renewalDay: spec.renewalDay,
      initialCompetenceMonth: Number(spec.startedOn.slice(5, 7)),
      initialCompetenceYear: Number(spec.startedOn.slice(0, 4)),
      status: ContractStatus.ACTIVE,
      createdAt: new Date(startedMs),
      updatedAt: new Date(startedMs),
    });
    const serviceByKind = new Map<ContentKind, string>();
    for (const service of spec.services) {
      if (service.kind === "trafego" && !hasTraffic) continue;
      const serviceId = nextId("service");
      serviceByKind.set(service.kind, serviceId);
      plan.services.push({
        id: serviceId,
        contractId,
        name: service.name,
        quantity: service.quantity,
        demandType: KIND[service.kind].type,
        contentTypeId: contentTypeFor(service.kind),
        periodicity: "monthly",
      });
    }
    plan.boards.push({
      id: boardId,
      clientId: id,
      name: `Quadro — ${spec.name}`,
      contractId,
      designSectorId: input.sectorIds.design,
      videoSectorId: input.sectorIds.video,
      createdById: admin.id,
      createdAt: new Date(startedMs),
      updatedAt: new Date(startedMs),
    });
    const lists: Record<string, string> = {};
    (
      [
        ["FEEDS", "Feeds e Reels"],
        ["STORIES", "Stories"],
        ["FOLLOW_UP", "Acompanhamento"],
        ["EXTRA", "Extras"],
      ] as const
    ).forEach(([type, name], order) => {
      const listId = nextId("list");
      lists[type] = listId;
      plan.lists.push({ id: listId, boardId, name, type, sortOrder: order });
    });
    const competenceByMonth = new Map<string, string>();
    for (const m of months) {
      if (endOfMonthKey(`${m.key}-01`) < spec.startedOn) continue;
      const competenceId = nextId("competence");
      competenceByMonth.set(m.key, competenceId);
      const open = m.key === currentMonthKey;
      plan.competences.push({
        id: competenceId,
        boardId,
        month: m.month,
        year: m.year,
        status: open ? CompetenceStatus.OPEN : CompetenceStatus.CLOSED,
        openedAt: new Date(at(nextBusinessDay(m.key > spec.startedOn.slice(0, 7) ? `${m.key}-01` : spec.startedOn), 9)),
        closedAt: open ? null : new Date(at(endOfMonthKey(`${m.key}-01`), 18)),
      });
      if (open) plan.currentCompetence.push({ boardId, competenceId });
    }
    plan.portals.push({
      id: nextId("portal"),
      clientId: id,
      boardId,
      displayName: spec.name,
      primaryColor: spec.brandColor,
      status: PortalStatus.ACTIVE,
      agencyContactName: requester.name,
      agencyContactUserId: requester.id,
      config: { calendarEnabled: true, completedVisible: true, upcomingVisible: true },
      createdAt: new Date(startedMs),
      updatedAt: new Date(startedMs),
    });
    return {
      spec, id, boardId, contractId, requesterId: requester.id, index, lists,
      competenceByMonth, serviceByKind,
    };
  });
  const clientByKey = new Map(clients.map((c) => [c.spec.key, c]));

  // Quem enxerga qual cliente: gestão e todos os executores; social, o seu.
  const linkSeen = new Set<string>();
  const link = (userId: string, clientId: string) => {
    const key = `${userId}|${clientId}`;
    if (linkSeen.has(key)) return;
    linkSeen.add(key);
    plan.userClientLinks.push({ userId, clientId, linkType: "USER_CLIENT" });
  };
  for (const c of clients) {
    link(manager.id, c.id);
    link(admin.id, c.id);
    link(c.requesterId, c.id);
    for (const m of [...pool.design, ...pool.video, ...(hasTraffic ? pool.trafego : [])]) link(m.id, c.id);
  }

  function contentTypeFor(kind: ContentKind): string | null {
    const slug = KIND[kind].contentSlug;
    return slug ? input.contentTypeIds[slug] ?? null : null;
  }

  // Demandas planejadas ---------------------------------------------------
  const specs: Spec[] = [];
  const themeCursor = new Map<string, number>();

  function themeFor(client: ClientCtx, kind: ContentKind, month: number): string {
    const list = client.spec.themes[kind] ?? [client.spec.services.find((s) => s.kind === kind)?.name ?? kind];
    const key = `${client.spec.key}|${kind}`;
    const n = themeCursor.get(key) ?? 0;
    themeCursor.set(key, n + 1);
    const repeated = n >= list.length;
    const base = list[n % list.length];
    return repeated ? `${base} (${MONTH_PT[month - 1]})` : base;
  }

  function titleFor(kind: ContentKind, theme: string): string {
    if (kind === "stories") return `Stories — ${theme}`;
    if (kind === "trafego") return theme;
    return `${KIND[kind].label} — ${theme}`;
  }

  function describe(client: ClientCtx, kind: ContentKind, theme: string, extra?: string): string {
    const what = KIND[kind].label.toLowerCase();
    return [
      extra ?? `Peça de ${what} sobre: ${theme}.`,
      `Tom de voz: ${client.spec.tone}.`,
      kind === "trafego" ? "Entrega: relatório de resultados e plano de otimização do mês." : `CTA: ${client.spec.cta}.`,
    ].join(" ");
  }

  const cardSeq = new Map<string, number>();
  for (const m of months) {
    for (const client of clients) {
      const compId = client.competenceByMonth.get(m.key);
      if (!compId) continue;
      const bdays = businessDaysOfMonth(m.year, m.month).filter((d) => d >= client.spec.startedOn);
      if (bdays.length === 0) continue;
      for (const service of client.spec.services) {
        const serviceId = client.serviceByKind.get(service.kind);
        if (!serviceId) continue;
        for (let i = 0; i < service.quantity; i += 1) {
          const kind = service.kind;
          const target =
            kind === "trafego"
              ? bdays[Math.max(0, bdays.length - 3)]
              : bdays[Math.min(bdays.length - 1, Math.floor(((i + 0.5 + client.index * 0.13) * bdays.length) / service.quantity))];
          const lead = KIND[kind].leadDays;
          let dueDay = addBusinessDays(target, -1);
          if (dueDay < bdays[0]) dueDay = bdays[0];
          const demandedDay = max(addBusinessDays(bdays[0], 1), addBusinessDays(dueDay, -lead));
          if (dueDay <= demandedDay) dueDay = addBusinessDays(demandedDay, 2);
          const createdDay = max(bdays[0], addBusinessDays(demandedDay, -rng.int(1, 3)));
          const theme = themeFor(client, kind, m.month);
          const seqKey = `${client.spec.key}|${m.key}|${kind}`;
          const index = (cardSeq.get(seqKey) ?? 0) + 1;
          cardSeq.set(seqKey, index);
          specs.push({
            id: nextId("demand"),
            client,
            kind,
            title: titleFor(kind, theme),
            description: describe(client, kind, theme),
            contractual: true,
            origin: DemandOrigin.CLIENT_BOARD,
            priority: KIND[kind].priority,
            createdAt: at(createdDay, 9 + rng.int(0, 3), rng.int(0, 59)),
            demandedAt: at(demandedDay, 9 + rng.int(0, 2), rng.int(0, 59)),
            dueDay,
            publishDay: addBusinessDays(dueDay, 1),
            competenceId: compId,
            serviceId,
            projectId: null,
            cardIndex: index,
            cardTotal: service.quantity,
            cardCode: `${client.spec.abbr}-${m.key.slice(2, 4)}${m.key.slice(5, 7)}-${KIND[kind].label.slice(0, 3).toUpperCase()}${pad(index)}`,
            requesterId: kind === "trafego" ? manager.id : client.requesterId,
            earliest: 0,
          });
        }
      }
    }
  }

  // Extras fora do contrato.
  for (const extra of SIM_EXTRAS) {
    const client = clientByKey.get(extra.client);
    if (!client || (extra.kind === "trafego" && !hasTraffic)) continue;
    const createdAt = at(extra.on, 9 + rng.int(0, 2), rng.int(0, 59));
    const dueDay = nextBusinessDay(addBusinessDays(extra.on, extra.dueInBusinessDays));
    specs.push({
      id: nextId("demand"),
      client,
      kind: extra.kind,
      title: extra.title,
      description: `${extra.brief} Tom de voz: ${client.spec.tone}. CTA: ${client.spec.cta}.`,
      contractual: false,
      origin: DemandOrigin.EXTRA,
      priority: extra.priority,
      createdAt,
      demandedAt: createdAt + rng.int(30, 90) * MINUTE_MS,
      dueDay,
      publishDay: addBusinessDays(dueDay, 1),
      competenceId: client.competenceByMonth.get(extra.on.slice(0, 7)) ?? null,
      serviceId: null,
      projectId: null,
      cardIndex: null,
      cardTotal: null,
      cardCode: null,
      requesterId: client.requesterId,
      earliest: 0,
    });
  }

  // Projetos --------------------------------------------------------------
  type ProjectCtx = {
    id: string;
    spec: (typeof SIM_PROJECTS)[number];
    taskSpecs: { spec: Spec; item: number }[];
    expectedByItem: Map<number, number>;
    client: ClientCtx;
  };
  const projects: ProjectCtx[] = [];
  for (const projectSpec of SIM_PROJECTS) {
    const client = clientByKey.get(projectSpec.client);
    if (!client || projectSpec.startsOn > todayKey) continue;
    const ctx: ProjectCtx = {
      id: nextId("project"),
      spec: projectSpec,
      taskSpecs: [],
      expectedByItem: new Map(),
      client,
    };
    for (const task of projectSpec.tasks) {
      if (task.kind === "trafego" && !hasTraffic) continue;
      ctx.expectedByItem.set(task.item, (ctx.expectedByItem.get(task.item) ?? 0) + 1);
      const createdAt = at(task.on, 9 + rng.int(0, 2), rng.int(0, 59));
      if (createdAt > nowMs) continue;
      const dueDay = nextBusinessDay(task.due);
      const demandedDay = max(addBusinessDays(task.on, 1), addBusinessDays(dueDay, -KIND[task.kind].leadDays));
      const spec: Spec = {
        id: nextId("demand"),
        client,
        kind: task.kind,
        title: task.title,
        description: `${task.brief} Tom de voz: ${client.spec.tone}. CTA: ${client.spec.cta}.`,
        contractual: false,
        origin: DemandOrigin.PROJECT,
        priority: "Alta",
        createdAt,
        demandedAt: at(demandedDay, 9 + rng.int(0, 2), rng.int(0, 59)),
        dueDay,
        publishDay: addBusinessDays(dueDay, 1),
        competenceId: client.competenceByMonth.get(task.on.slice(0, 7)) ?? null,
        serviceId: null,
        projectId: ctx.id,
        cardIndex: null,
        cardTotal: null,
        cardCode: null,
        requesterId: client.requesterId,
        earliest: 0,
      };
      ctx.taskSpecs.push({ spec, item: task.item });
      specs.push(spec);
    }
    projects.push(ctx);
  }

  // Captações: reels e vídeos esperam o material gravado do mês.
  const shootMs = new Map<string, number[]>();
  for (const shoot of SIM_SHOOTS) {
    const arr = shootMs.get(shoot.client) ?? [];
    arr.push(at(shoot.on, 9));
    shootMs.set(shoot.client, arr);
  }
  for (const s of specs) {
    if (s.kind !== "reels" && s.kind !== "video") continue;
    const dueMs = endOfDayMs(s.dueDay);
    const candidates = (shootMs.get(s.client.spec.key) ?? []).filter(
      (t) => t < dueMs - 4 * DAY_MS && t > dueMs - 25 * DAY_MS
    );
    if (candidates.length) {
      const shootDay = dayKey(new Date(Math.max(...candidates)));
      s.earliest = at(addBusinessDays(shootDay, 1), 9);
    }
  }

  // Só entram no quadro as demandas já criadas; as futuras ainda nem existem.
  const live = specs.filter((s) => s.createdAt <= nowMs).sort((a, b) => a.demandedAt - b.demandedAt || a.id.localeCompare(b.id));

  // Linha do tempo de cada demanda ---------------------------------------
  const windowStartMs = at(previousStart, 0);
  const progressOf = (ms: number) => Math.min(1, Math.max(0, (ms - windowStartMs) / Math.max(1, nowMs - windowStartMs)));
  const busy = new Map<string, Interval[]>();
  const busyOf = (userId: string) => {
    let list = busy.get(userId);
    if (!list) busy.set(userId, (list = []));
    return list;
  };

  type Timeline = {
    spec: Spec;
    executorId: string | null;
    assignedAt: number;
    method: AssignmentMethod;
    prodSegs: Interval[];
    adjSegs: Interval[];
    prodEnd: number | null;
    requestedAt: number | null;
    adjEnd: number | null;
    approvedAt: number | null;
    scheduledAt: number | null;
    publishedAt: number | null;
    dueMs: number;
  };
  const timelines: Timeline[] = [];

  for (const spec of live) {
    const params = KIND[spec.kind];
    const dueMs = at(spec.dueDay, 18);
    if (spec.demandedAt > nowMs) {
      timelines.push({
        spec, executorId: null, assignedAt: 0, method: AssignmentMethod.LEADER, prodSegs: [], adjSegs: [],
        prodEnd: null, requestedAt: null, adjEnd: null, approvedAt: null, scheduledAt: null, publishedAt: null, dueMs,
      });
      continue;
    }

    const trend = 1.5 - 0.9 * progressOf(spec.demandedAt);
    const lateChance = Math.min(0.6, params.late * trend);
    const waitDays = rng.chance(lateChance)
      ? params.leadDays + rng.int(0, 2)
      : rng.int(0, Math.max(0, params.leadDays - 2));
    const demandedDay = dayKey(new Date(spec.demandedAt));
    const startWanted = Math.max(
      spec.earliest,
      at(addBusinessDays(demandedDay, waitDays), 9 + rng.int(0, 5), rng.int(0, 59)),
      spec.demandedAt + 30 * MINUTE_MS
    );
    const minutes = Math.max(15, Math.round(params.minutes * rng.between(0.75, 1.6)));

    // Quem pega: a pessoa do setor que fica livre mais cedo.
    const candidates = pool[params.sector];
    const choice = candidates
      .map((m) => ({ m, start: takeSlots(busyOf(m.id), startWanted, 1)[0].start, tie: rng.next() }))
      .sort((a, b) => a.start - b.start || a.tie - b.tie)[0].m;
    const prodSegs = takeSlots(busyOf(choice.id), startWanted, minutes);
    busyOf(choice.id).push(...prodSegs);
    const prodEnd = prodSegs[prodSegs.length - 1].end;

    const selfPick = rng.chance(0.2) && waitDays <= 1;
    const assignedAt = selfPick ? prodSegs[0].start : spec.demandedAt + rng.int(15, 90) * MINUTE_MS;

    const clientFactor = (spec.client.spec.onboarding && spec.demandedAt < at(addBusinessDays(spec.client.spec.startedOn, 25), 0) ? 1.7 : 1) * (spec.client.spec.demanding ? 1.3 : 1);
    const reworkChance = Math.min(0.85, params.rework * (1.3 - 0.5 * progressOf(spec.demandedAt)) * clientFactor);
    const rework = rng.chance(reworkChance);

    let decisionAt = clampToWork(prodEnd + rng.int(60, 600) * MINUTE_MS);
    let requestedAt: number | null = null;
    let adjSegs: Interval[] = [];
    let adjEnd: number | null = null;
    if (rework) {
      requestedAt = decisionAt;
      const adjMinutes = Math.max(15, Math.round(minutes * rng.between(0.2, 0.45)));
      adjSegs = takeSlots(busyOf(choice.id), requestedAt + rng.int(30, 180) * MINUTE_MS, adjMinutes);
      busyOf(choice.id).push(...adjSegs);
      adjEnd = adjSegs[adjSegs.length - 1].end;
      decisionAt = clampToWork(adjEnd + rng.int(60, 480) * MINUTE_MS);
    }
    const approvedAt = decisionAt;
    const final = spec.kind === "trafego";
    const scheduledAt = final ? null : clampToWork(approvedAt + rng.int(20, 120) * MINUTE_MS);
    const publishedAt = Math.max(
      at(spec.publishDay, 11, rng.int(0, 30)),
      clampToWork((scheduledAt ?? approvedAt) + 30 * MINUTE_MS)
    );

    timelines.push({
      spec, executorId: choice.id, assignedAt,
      method: selfPick ? AssignmentMethod.SELF : AssignmentMethod.LEADER,
      prodSegs, adjSegs, prodEnd, requestedAt, adjEnd, approvedAt, scheduledAt, publishedAt, dueMs,
    });
  }

  // Estado de cada demanda em "agora" e as linhas do banco -----------------
  const done = (t: number | null) => t !== null && t <= nowMs;
  const deliveryRows: (DeliveryRow & { sectorId: string | null; at: number })[] = [];

  const recentNotifications: Prisma.NotificationCreateManyInput[] = [];
  const windowFloor = nowMs - NOTIFICATION_WINDOW_DAYS * DAY_MS;
  const notify = (
    userId: string,
    type: Prisma.NotificationCreateManyInput["type"],
    title: string,
    message: string,
    demandId: string,
    at_: number
  ) => {
    if (at_ < windowFloor || at_ > nowMs) return;
    recentNotifications.push({
      id: nextId("notif"), userId, type, title, message,
      link: `/demandas?abrir=${demandId}`,
      read: at_ < nowMs - 2 * DAY_MS,
      createdAt: new Date(at_),
    });
  };

  const demandStatusById = new Map<string, DemandStatus>();
  const lastEventById = new Map<string, number>();
  let sortOrder = 0;

  for (const t of timelines) {
    const { spec } = t;
    const params = KIND[spec.kind];
    const planning = spec.demandedAt > nowMs;
    const finalKind = spec.kind === "trafego";
    let status: DemandStatus;
    let assigneeId: string | null = null;
    const firstStart = t.prodSegs[0]?.start ?? null;

    if (planning) {
      status = rng.chance(0.5) && spec.demandedAt - nowMs < 5 * DAY_MS ? DemandStatus.PLANNING : DemandStatus.PENDING_PLANNING;
    } else if (!done(t.assignedAt) && !(firstStart !== null && firstStart <= nowMs)) {
      status = DemandStatus.AVAILABLE;
    } else if (!done(firstStart)) {
      status = DemandStatus.DEMANDED;
      assigneeId = t.executorId;
    } else if (!done(t.prodEnd)) {
      status = DemandStatus.IN_PRODUCTION;
      assigneeId = t.executorId;
    } else if (t.requestedAt !== null && done(t.requestedAt) && !done(t.adjEnd)) {
      status = DemandStatus.ADJUSTMENTS;
      assigneeId = t.executorId;
    } else if (!done(t.approvedAt)) {
      status = DemandStatus.IN_REVIEW;
      assigneeId = t.executorId;
    } else if (finalKind ? !done(t.publishedAt) : !done(t.scheduledAt)) {
      status = DemandStatus.APPROVED;
      assigneeId = t.executorId;
    } else if (!finalKind && !done(t.publishedAt)) {
      status = DemandStatus.SCHEDULED;
      assigneeId = t.executorId;
    } else {
      status = finalKind ? DemandStatus.DONE : DemandStatus.PUBLISHED;
      assigneeId = t.executorId;
    }
    demandStatusById.set(spec.id, status);

    const locked = !planning;
    const sector = locked ? sectorId(params.sector) : null;
    const afterReview = done(t.prodEnd);
    const published = status === DemandStatus.PUBLISHED || status === DemandStatus.DONE;
    const visible = ([DemandStatus.APPROVED, DemandStatus.SCHEDULED, DemandStatus.PUBLISHED, DemandStatus.DONE] as DemandStatus[]).includes(status);
    const materialUrl = afterReview ? `https://drive.example.com/samps-sim/${spec.id}` : null;
    const publishedUrl = status === DemandStatus.PUBLISHED ? `https://social.example.com/samps-sim/${spec.id}` : null;
    const isVideo = spec.kind === "reels" || spec.kind === "video";
    const durationSeconds = isVideo ? (spec.kind === "reels" ? rng.pick([30, 45, 60]) : rng.pick([90, 120, 150])) : null;
    const hint = { assigneeId };
    const boardColumn = boardColumnForDemandStatus(status, hint);
    const dueDate = new Date(t.dueMs);
    const lastEvent = Math.max(
      spec.createdAt,
      locked ? spec.demandedAt : 0,
      ...[t.prodSegs.at(-1)?.end, t.adjSegs.at(-1)?.end, t.requestedAt, t.approvedAt, t.scheduledAt, t.publishedAt]
        .filter((v): v is number => v != null && v <= nowMs)
    );
    lastEventById.set(spec.id, lastEvent);

    const violations = demandCycleViolations({
      status, boardColumn, title: spec.title,
      briefingLockedAt: locked ? new Date(spec.demandedAt) : null,
      description: spec.description,
      format: isVideo ? "vídeo" : null,
      orientation: isVideo ? "9:16" : null,
      durationSeconds, demandType: params.type,
      contentTypeSlug: params.contentSlug,
      sectorId: sector, assigneeId, materialUrl, publishedUrl, visibleToClient: visible,
    });
    if (violations.length) {
      throw new Error(`Demanda "${spec.title}" fora do ciclo (${status}): ${violations.join("; ")}`);
    }

    plan.demands.push({
      id: spec.id,
      clientId: spec.client.id,
      boardId: spec.client.boardId,
      listId: spec.client.lists[spec.contractual || spec.origin === DemandOrigin.PROJECT ? params.list : "EXTRA"],
      competenceId: spec.competenceId,
      contractServiceId: spec.serviceId,
      title: spec.title,
      description: spec.description,
      type: params.type,
      origin: spec.origin,
      format: isVideo ? "vídeo" : null,
      platform: "Instagram",
      complexityLevel: params.complexity,
      sectorId: sector,
      assigneeId,
      requesterId: spec.requesterId,
      priorityId: input.priorityIds[spec.priority],
      contentTypeId: contentTypeFor(spec.kind),
      status,
      internalStatus: internalStatusForDemandStatus(status, hint),
      externalStatus: visible ? (published ? "Publicado" : "Aprovado") : locked ? "Em preparação" : null,
      boardColumn,
      sortOrder: sortOrder++,
      cardCode: spec.cardCode,
      cardIndex: spec.cardIndex,
      cardTotalInType: spec.cardTotal,
      isContractual: spec.contractual,
      dueDate,
      publishDate: new Date(at(spec.publishDay, 11)),
      briefingLockedAt: locked ? new Date(spec.demandedAt) : null,
      briefingLockedById: locked ? spec.requesterId : null,
      durationSeconds,
      orientation: isVideo ? "9:16" : null,
      productionStartedAt: done(firstStart) ? new Date(firstStart!) : null,
      productionCompletedAt: afterReview ? new Date(t.prodEnd!) : null,
      publishedAt: published ? new Date(t.publishedAt!) : null,
      publishedUrl,
      deliveredAt: published ? new Date(t.publishedAt!) : null,
      visibleToClient: visible,
      projectId: spec.projectId,
      materialUrl,
      scheduledExecutionAt: status === DemandStatus.SCHEDULED || status === DemandStatus.PUBLISHED ? new Date(at(spec.publishDay, 11)) : null,
      createdAt: new Date(spec.createdAt),
      updatedAt: new Date(lastEvent),
    });

    if (locked) {
      const assignmentStatus = assignmentStatusForDemandStatus(status, hint) ?? AssignmentStatus.AVAILABLE;
      plan.assignments.push({
        id: nextId("assignment"),
        demandId: spec.id,
        sectorId: sectorId(params.sector),
        executorId: assigneeId,
        assignedById: assigneeId ? (t.method === AssignmentMethod.SELF ? assigneeId : manager.id) : null,
        assignedAt: new Date(assigneeId ? t.assignedAt : spec.demandedAt),
        status: assignmentStatus,
        method: assigneeId ? t.method : null,
        createdAt: new Date(spec.demandedAt),
        updatedAt: new Date(lastEvent),
      });
    }

    // Sessões de trabalho: só o que terminou antes de agora.
    const emitSegs = (segs: Interval[], stage: "PRODUCTION" | "ADJUSTMENT") => {
      for (const seg of segs) {
        if (seg.end > nowMs || !t.executorId) continue;
        const sessionId = nextId("session");
        const wall = Math.round((seg.end - seg.start) / MINUTE_MS);
        const pause = wall >= 90 && rng.chance(0.12) ? rng.int(10, 30) : 0;
        plan.sessions.push({
          id: sessionId, demandId: spec.id, userId: t.executorId, stage, status: "COMPLETED",
          startedAt: new Date(seg.start), endedAt: new Date(seg.end),
          totalActiveSeconds: (wall - pause) * 60,
          createdAt: new Date(seg.start), updatedAt: new Date(seg.end),
        });
        if (pause) {
          const pauseStart = seg.start + Math.round(wall / 2) * MINUTE_MS;
          plan.pauses.push({
            id: nextId("pause"), sessionId, reason: rng.pick(PAUSE_REASONS),
            startedAt: new Date(pauseStart), endedAt: new Date(pauseStart + pause * MINUTE_MS),
            createdAt: new Date(pauseStart),
          });
        }
      }
    };
    emitSegs(t.prodSegs, "PRODUCTION");
    emitSegs(t.adjSegs, "ADJUSTMENT");

    // Comentários que contam o que aconteceu.
    const comment = (userId: string, at_: number, text: string, commentType: Prisma.CommentCreateManyInput["commentType"], visibility: "INTERNAL" | "EXTERNAL" = "INTERNAL") => {
      if (at_ > nowMs) return;
      plan.comments.push({ id: nextId("comment"), userId, demandId: spec.id, text, commentType, visibility, createdAt: new Date(at_) });
    };
    if (t.requestedAt !== null && t.executorId) {
      comment(spec.requesterId, t.requestedAt, rng.pick(ADJUSTMENT_REQUESTS), "ADJUSTMENT_REQUEST");
      if (t.adjEnd !== null) comment(t.executorId, t.adjEnd, rng.pick(ADJUSTMENT_RESPONSES), "ADJUSTMENT_RESPONSE");
    }
    if (t.approvedAt !== null) {
      comment(spec.requesterId, t.approvedAt, "Aprovado internamente, pode seguir para agendamento.", "INTERNAL_APPROVAL");
      if (spec.client.spec.demanding || rng.chance(0.3)) {
        comment(spec.requesterId, t.approvedAt + 40 * MINUTE_MS, "Cliente aprovou a peça pelo WhatsApp.", "CLIENT_APPROVAL", "EXTERNAL");
      }
    }

    // Atraso: aberto enquanto não foi entregue, resolvido quando termina.
    if (!planning && t.dueMs < nowMs && (t.prodEnd === null || t.prodEnd > t.dueMs)) {
      const resolvedAt = published ? t.publishedAt : null;
      const detectedAt = at(addDays(spec.dueDay, 1), 8);
      if (detectedAt <= nowMs) {
        plan.delays.push({
          id: nextId("delay"), demandId: spec.id, clientId: spec.client.id,
          originalDueDate: dueDate, detectedAt: new Date(detectedAt),
          resolvedAt: resolvedAt ? new Date(resolvedAt) : null,
          resolution: resolvedAt ? "COMPLETED" : null,
          daysOverdue: Math.max(1, Math.ceil(((resolvedAt ?? nowMs) - t.dueMs) / DAY_MS)),
          createdAt: new Date(detectedAt),
        });
        if (!resolvedAt && t.executorId) {
          notify(t.executorId, "DEMAND_OVERDUE", "Demanda atrasada", `"${spec.title}" passou do prazo.`, spec.id, detectedAt);
        }
      }
    }

    // Avisos recentes para quem está com a demanda.
    if (t.executorId && locked && done(t.assignedAt)) {
      notify(t.executorId, "DEMAND_ASSIGNED", "Nova demanda atribuída", `"${spec.title}" é sua.`, spec.id, t.assignedAt);
    }
    if (t.executorId && t.requestedAt !== null) {
      notify(t.executorId, "ADJUSTMENT_REQUESTED", "Ajuste solicitado", `Pediram ajustes em "${spec.title}".`, spec.id, t.requestedAt);
    }

    if (afterReview && t.executorId) {
      const exec = team.find((m) => m.id === t.executorId)!;
      deliveryRows.push({
        id: spec.id,
        createdAt: new Date(spec.createdAt),
        dueDate,
        completedAt: new Date(t.prodEnd!),
        assignee: { id: exec.id, name: exec.name },
        contentType: null,
        hadRework: t.adjSegs.some((s) => s.end <= nowMs),
        activeSeconds: 0,
        sectorId: sectorId(params.sector),
        at: t.prodEnd!,
      });
    }
  }
  plan.notifications.push(...recentNotifications);

  // Projetos: andamento calculado a partir das próprias demandas ---------
  for (const p of projects) {
    const total = p.spec.checklist.length;
    const doneItems = p.spec.checklist.map((_, item) => {
      const expected = p.expectedByItem.get(item) ?? 0;
      const finished = p.taskSpecs.filter(
        (s) =>
          s.item === item &&
          ([DemandStatus.PUBLISHED, DemandStatus.DONE] as DemandStatus[]).includes(demandStatusById.get(s.spec.id)!)
      ).length;
      return expected > 0 && finished === expected;
    });
    const doneCount = doneItems.filter(Boolean).length;
    const allDone = doneCount === total;
    const startMs = at(p.spec.startsOn, 9);
    plan.projects.push({
      id: p.id,
      clientId: p.client.id,
      title: p.spec.title,
      description: p.spec.description,
      ownerId: p.client.requesterId,
      status: allDone ? ProjectStatus.COMPLETED : ProjectStatus.ACTIVE,
      progress: Math.round((doneCount / total) * 100),
      startDate: new Date(startMs),
      dueDate: new Date(at(p.spec.dueOn, 18)),
      createdAt: new Date(startMs),
      updatedAt: new Date(Math.max(startMs, ...p.taskSpecs.map((s) => lastEventById.get(s.spec.id) ?? 0))),
    });
    p.spec.checklist.forEach((title, item) =>
      plan.projectItems.push({ id: nextId("pitem"), projectId: p.id, title, isDone: doneItems[item], sortOrder: item })
    );
    const people = new Set<string>([p.client.requesterId, manager.id]);
    for (const demand of plan.demands) {
      if (demand.projectId === p.id && demand.assigneeId) people.add(demand.assigneeId);
    }
    for (const userId of Array.from(people)) {
      plan.projectParticipants.push({ id: nextId("pp"), projectId: p.id, userId });
      plan.userProjectLinks.push({ id: nextId("upl"), projectId: p.id, userId });
    }
  }

  // Captações -----------------------------------------------------------
  const editor = pool.video.find((m) => m.id !== videomaker.id);
  for (const shoot of SIM_SHOOTS) {
    const client = clientByKey.get(shoot.client);
    if (!client) continue;
    const past = shoot.on < todayKey;
    const id = nextId("shoot");
    plan.shoots.push({
      id, clientId: client.id, title: shoot.title,
      date: new Date(at(shoot.on, 12)),
      startTime: shoot.start, endTime: shoot.end, location: shoot.location,
      ownerId: videomaker.id, shootType: shoot.type,
      status: past ? ShootStatus.COMPLETED : shoot.on <= addDays(todayKey, 3) ? ShootStatus.CONFIRMED : ShootStatus.PLANNED,
      notes: past ? "Material entregue ao time de edição no mesmo dia." : "Roteiro e lista de takes enviados ao cliente.",
      createdAt: new Date(at(addBusinessDays(shoot.on, -5), 10)),
      updatedAt: new Date(Math.min(nowMs, at(shoot.on, 18))),
    });
    plan.shootParticipants.push({ id: nextId("sp"), shootId: id, userId: videomaker.id });
    if (editor) plan.shootParticipants.push({ id: nextId("sp"), shootId: id, userId: editor.id });
  }

  // Agenda -------------------------------------------------------------
  const meet = (title: string, startsOn: string, startHour: number, minutes: number, description: string, url?: string) => {
    const startsAt = at(startsOn, startHour);
    plan.meetings.push({
      id: nextId("meeting"), title, description, meetingUrl: url ?? null, kind: "MEETING",
      startsAt: new Date(startsAt), endsAt: new Date(startsAt + minutes * MINUTE_MS),
      createdById: manager.id, createdAt: new Date(Math.min(nowMs, startsAt - 3 * DAY_MS)),
      updatedAt: new Date(Math.min(nowMs, startsAt - 3 * DAY_MS)),
    });
  };
  const mondayAfter = (key: string) => {
    let d = key;
    while (new Date(`${d}T00:00:00.000Z`).getUTCDay() !== 1) d = addDays(d, 1);
    return d;
  };
  for (let monday = mondayAfter(previousStart); monday <= addDays(todayKey, 21); monday = addDays(monday, 7)) {
    if (!isBusinessDay(monday)) continue;
    meet("Planejamento da semana", monday, 10, 45, "Prioridades da semana, capacidade de cada setor e pendências de aprovação.", "https://meet.example.com/samps-semanal");
  }
  for (const m of [...months, { year: Number(shiftMonths(currentStart, 0).slice(0, 4)), month: 0, key: "" }].filter((m) => m.key)) {
    for (const client of clients) {
      const days = businessDaysOfMonth(m.year, m.month).filter((d) => d >= client.spec.startedOn);
      if (days.length < 16) continue;
      const day = days[Math.min(days.length - 1, 14 + client.index)];
      meet(`Reunião de resultados — ${client.spec.name}`, day, 15, 60, "Números do mês, o que funcionou e plano do próximo ciclo de conteúdo.", `https://meet.example.com/samps-${client.spec.key}`);
    }
  }
  const terra = clientByKey.get("terra");
  if (terra) meet("Kickoff — Terra Viva Imóveis", terra.spec.startedOn, 10, 90, "Alinhamento de metas, calendário do lançamento do Vista Verde e acessos.", "https://meet.example.com/samps-terra-kickoff");
  const retroDay = addBusinessDays(currentStart, -1);
  if (retroDay >= previousStart) meet("Retrospectiva do trimestre e planejamento do próximo", retroDay, 14, 120, "Resultados do trimestre, aprendizados e metas e OKRs do novo ciclo.", "https://meet.example.com/samps-retro");

  // Metas e OKRs ---------------------------------------------------------
  const rangeOf = (from: string, to: string) => ({ from: new Date(startOfDayMs(from)), to: new Date(endOfDayMs(to)) });
  const kpi = (from: string, to: string, filter: (r: (typeof deliveryRows)[number]) => boolean = () => true) => {
    const range = rangeOf(from, to);
    const rows = deliveryRows.filter((r) => filter(r) && r.completedAt >= range.from && r.completedAt <= range.to);
    const summary = buildPerformanceSummary({
      range, rows, workedSeconds: { current: 0, previous: 0 },
      snapshot: { overdue: 0, adjustments: 0, unassignedOpen: 0, overdueBySector: [] },
    });
    return summary.indicators;
  };
  const prev = kpi(previousStart, previousEnd);
  const prevDesign = kpi(previousStart, previousEnd, (r) => r.sectorId === input.sectorIds.design);
  const prevVideo = kpi(previousStart, previousEnd, (r) => r.sectorId === input.sectorIds.video);
  const curNow = kpi(currentStart, todayKey);
  const prevCompleted = prev.COMPLETED.value ?? 0;
  const prevOnTime = prev.ON_TIME_RATE.value ?? 0;
  const prevRework = prev.REWORK_RATE.value ?? 0;

  const addGoal = (g: {
    metric: KpiKey; scope: "AGENCY" | "SECTOR" | "USER"; sectorId?: string; userId?: string;
    target: number; period: "previous" | "current"; note: string; warnMargin?: number;
  }) => {
    const from = g.period === "previous" ? previousStart : currentStart;
    const to = g.period === "previous" ? previousEnd : currentEnd;
    plan.goals.push({
      id: nextId("goal"), metric: g.metric, scope: g.scope,
      sectorId: g.sectorId ?? null, userId: g.userId ?? null,
      target: g.target, warnMargin: g.warnMargin ?? 0.1,
      startsOn: new Date(startOfDayMs(from)), endsOn: new Date(endOfDayMs(to)),
      note: g.note, active: true, createdById: manager.id,
      createdAt: new Date(startOfDayMs(from) + 10 * 3600 * 1000),
      updatedAt: new Date(startOfDayMs(from) + 10 * 3600 * 1000),
    });
  };
  const pct = (v: number) => Math.min(1, round(v, 0.05));

  // Trimestre anterior (encerrado): uma meta batida, uma por pouco, uma não batida.
  addGoal({ metric: "COMPLETED", scope: "AGENCY", target: Math.max(10, round(prevCompleted * 0.95, 10)), period: "previous", note: "Volume contratado dos cinco clientes ativos." });
  addGoal({ metric: "ON_TIME_RATE", scope: "AGENCY", target: pct(prevOnTime + 0.06), period: "previous", note: "Meta de pontualidade definida após os atrasos do segundo trimestre." });
  addGoal({ metric: "REWORK_RATE", scope: "AGENCY", target: pct(prevRework + 0.03), period: "previous", note: "Reduzir o retrabalho com briefings mais completos." });
  addGoal({ metric: "ON_TIME_RATE", scope: "SECTOR", sectorId: input.sectorIds.design, target: pct((prevDesign.ON_TIME_RATE.value ?? 0.8) - 0.02), period: "previous", note: "Design: arte pronta antes do prazo de aprovação." });
  addGoal({ metric: "ON_TIME_RATE", scope: "SECTOR", sectorId: input.sectorIds.video, target: pct((prevVideo.ON_TIME_RATE.value ?? 0.7) + 0.1), period: "previous", note: "Vídeo: edição entregue com folga para a revisão do cliente." });

  // Trimestre atual: metas mais altas, partindo do que o anterior mostrou.
  addGoal({ metric: "COMPLETED", scope: "AGENCY", target: Math.max(10, round(prevCompleted * 1.05, 10)), period: "current", note: "Mesmo contrato, com o Vista Verde rodando o trimestre inteiro." });
  addGoal({ metric: "ON_TIME_RATE", scope: "AGENCY", target: pct(Math.max(0.95, prevOnTime + 0.1)), period: "current", note: "Consolidar a melhora de pontualidade do trimestre passado." });
  addGoal({ metric: "REWORK_RATE", scope: "AGENCY", target: pct(Math.max(0.1, prevRework - 0.12)), period: "current", note: "Retrabalho sob controle, principalmente em vídeo." });
  addGoal({ metric: "ON_TIME_RATE", scope: "SECTOR", sectorId: input.sectorIds.video, target: pct(Math.max(0.85, (prevVideo.ON_TIME_RATE.value ?? 0.7) + 0.12)), period: "current", note: "Vídeo precisa recuperar o ritmo antes da campanha de fim de ano." });
  addGoal({ metric: "AVG_LEAD_TIME_DAYS", scope: "SECTOR", sectorId: input.sectorIds.design, target: Math.max(1, round((prevDesign.AVG_LEAD_TIME_DAYS.value ?? 6) * 0.9, 0.5)), period: "current", note: "Design: reduzir o tempo entre a demanda criada e a arte entregue." });
  const topDesigner = pool.design[0];
  addGoal({ metric: "COMPLETED", scope: "USER", userId: topDesigner.id, target: Math.max(10, round((prevDesign.COMPLETED.value ?? 0) * 1.05, 10)), period: "current", note: "Meta individual acordada na retrospectiva do trimestre." });

  // OKRs ------------------------------------------------------------------
  const objectiveBase = (ownerId: string, from: string, to: string) => ({
    ownerId, startsOn: new Date(startOfDayMs(from)), endsOn: new Date(endOfDayMs(to)),
    createdById: manager.id,
    createdAt: new Date(startOfDayMs(from) + 11 * 3600 * 1000),
    updatedAt: new Date(startOfDayMs(from) + 11 * 3600 * 1000),
  });
  const sectorLeader = (slug: "design" | "video") => pool[slug][0].id;

  const shootsHeld = SIM_SHOOTS.filter((s) => clientByKey.has(s.client) && s.on >= previousStart && s.on <= previousEnd && s.on < todayKey).length;
  const shootsPlanned = SIM_SHOOTS.filter((s) => clientByKey.has(s.client) && s.on >= previousStart && s.on <= previousEnd).length;
  const reelsPublished = plan.demands.filter(
    (d) => d.type === DemandType.REEL && d.status === DemandStatus.PUBLISHED && d.publishedAt! >= new Date(startOfDayMs(previousStart)) && d.publishedAt! <= new Date(endOfDayMs(previousEnd))
  ).length;
  const reelsContracted = clients.reduce((sum, c) => sum + (c.spec.services.find((s) => s.kind === "reels")?.quantity ?? 0) * Array.from(c.competenceByMonth.keys()).filter((k) => k >= previousStart.slice(0, 7) && k <= previousEnd.slice(0, 7)).length, 0);
  const resultMeetingsHeld = plan.meetings.filter((m) => m.title.startsWith("Reunião de resultados") && (m.startsAt as Date) >= new Date(startOfDayMs(currentStart)) && (m.startsAt as Date).getTime() <= nowMs).length;
  const resultMeetingsPlanned = plan.meetings.filter((m) => m.title.startsWith("Reunião de resultados") && (m.startsAt as Date) >= new Date(startOfDayMs(currentStart)) && (m.startsAt as Date) <= new Date(endOfDayMs(currentEnd))).length;

  type KrDef = {
    title: string; kind: "KPI" | "MANUAL"; metric?: KpiKey; unit?: string;
    start: number; target: number;
    /** Leituras (valor, dia, confiança, nota) dos check-ins, só para KR manual. */
    readings?: { value: number; on: string; confidence: "ON_TRACK" | "AT_RISK" | "OFF_TRACK"; note: string }[];
  };
  const addObjective = (o: {
    title: string; description: string; ownerId: string; scope: "AGENCY" | "SECTOR";
    sectorId?: string; parentId?: string; period: "previous" | "current"; status: "ACTIVE" | "DONE"; keyResults: KrDef[];
  }) => {
    const from = o.period === "previous" ? previousStart : currentStart;
    const to = o.period === "previous" ? previousEnd : currentEnd;
    const id = nextId("objective");
    plan.objectives.push({
      id, title: o.title, description: o.description, scope: o.scope,
      sectorId: o.sectorId ?? null, parentId: o.parentId ?? null, status: o.status,
      ...objectiveBase(o.ownerId, from, to),
    });
    o.keyResults.forEach((kr, order) => {
      const krId = nextId("kr");
      const last = kr.readings?.[kr.readings.length - 1];
      plan.keyResults.push({
        id: krId, objectiveId: id, title: kr.title, kind: kr.kind, metric: kr.metric ?? null,
        unit: kr.unit ?? null, startValue: kr.start, targetValue: kr.target,
        currentValue: kr.kind === "MANUAL" ? last?.value ?? null : null, sortOrder: order,
        createdAt: new Date(startOfDayMs(from) + 11 * 3600 * 1000),
        updatedAt: new Date(startOfDayMs(from) + 11 * 3600 * 1000),
      });
      for (const r of kr.readings ?? []) {
        if (at(r.on, 10) > nowMs) continue;
        plan.checkIns.push({
          id: nextId("checkin"), keyResultId: krId, authorId: o.ownerId, value: r.value,
          confidence: r.confidence, note: r.note, createdAt: new Date(at(r.on, 10)),
        });
      }
    });
    return id;
  };

  const monday = (offsetWeeks: number, base: string) => nextBusinessDay(mondayAfter(addDays(base, offsetWeeks * 7)));
  const q1 = (w: number) => monday(w, previousStart);
  const reelStep = (v: number, f: number) => Math.round(v * f);

  addObjective({
    title: "Entregar com previsibilidade", ownerId: manager.id, scope: "AGENCY", period: "previous", status: "DONE",
    description: "Cliente sabe quando a peça chega e a equipe para de apagar incêndio.",
    keyResults: [
      { title: "Entregas no prazo", kind: "KPI", metric: "ON_TIME_RATE", start: 0.7, target: pct(prevOnTime + 0.06) },
      { title: "Entregas que voltaram para ajuste", kind: "KPI", metric: "REWORK_RATE", start: pct(prevRework + 0.12), target: pct(prevRework + 0.03) },
      {
        title: "Clientes com calendário do mês aprovado até o dia 25", kind: "MANUAL", unit: "clientes", start: 0, target: clients.length,
        readings: [
          { value: 2, on: q1(3), confidence: "AT_RISK", note: "Dois clientes aprovaram o calendário a tempo; os outros atrasam a resposta." },
          { value: 3, on: q1(7), confidence: "ON_TRACK", note: "Passamos a enviar o calendário no dia 20 com lembrete automático." },
          { value: Math.max(1, clients.length - 1), on: q1(12), confidence: "ON_TRACK", note: "Só a Mendes & Prado ainda aprova perto do dia 28." },
        ],
      },
    ],
  });
  addObjective({
    title: "Colocar o Reels no centro da operação", ownerId: sectorLeader("video"), scope: "SECTOR", sectorId: input.sectorIds.video, period: "previous", status: "DONE",
    description: "Mais vídeo curto para os clientes de performance, com captação planejada.",
    keyResults: [
      {
        title: "Reels publicados no trimestre", kind: "MANUAL", unit: "reels", start: 0, target: Math.max(5, Math.ceil((Math.max(reelsContracted, reelsPublished) + 2) / 5) * 5),
        readings: [
          { value: reelStep(reelsPublished, 0.3), on: q1(3), confidence: "AT_RISK", note: "Ritmo abaixo do contratado enquanto a captação de julho não entra na edição." },
          { value: reelStep(reelsPublished, 0.65), on: q1(7), confidence: "ON_TRACK", note: "Captações em dia e edição em fila curta." },
          { value: reelsPublished, on: q1(12), confidence: "ON_TRACK", note: "Fechamos o trimestre com os reels contratados publicados." },
        ],
      },
      {
        title: "Captações realizadas no calendário", kind: "MANUAL", unit: "captações", start: 0, target: Math.max(1, shootsPlanned),
        readings: [
          { value: Math.max(0, shootsHeld - 3), on: q1(4), confidence: "ON_TRACK", note: "Captações de julho feitas conforme o combinado." },
          { value: shootsHeld, on: q1(12), confidence: "ON_TRACK", note: "Todas as captações do trimestre foram realizadas." },
        ],
      },
    ],
  });
  addObjective({
    title: "Reduzir retrabalho nas artes", ownerId: sectorLeader("design"), scope: "SECTOR", sectorId: input.sectorIds.design, period: "previous", status: "DONE",
    description: "Peça certa na primeira entrega: briefing completo e referência antes de começar.",
    keyResults: [
      { title: "Artes que voltaram para ajuste", kind: "KPI", metric: "REWORK_RATE", start: pct((prevDesign.REWORK_RATE.value ?? 0.2) + 0.12), target: pct((prevDesign.REWORK_RATE.value ?? 0.2) + 0.02) },
    ],
  });

  const agencyNow = addObjective({
    title: "Fechar o ano com entregas no prazo e retrabalho sob controle", ownerId: manager.id, scope: "AGENCY", period: "current", status: "ACTIVE",
    description: "Manter a melhora do trimestre passado com um cliente novo a mais na operação.",
    keyResults: [
      { title: "Entregas no prazo", kind: "KPI", metric: "ON_TIME_RATE", start: prevOnTime, target: pct(Math.max(0.95, prevOnTime + 0.1)) },
      { title: "Entregas que voltaram para ajuste", kind: "KPI", metric: "REWORK_RATE", start: prevRework, target: pct(Math.max(0.1, prevRework - 0.12)) },
    ],
  });
  addObjective({
    title: "Aumentar a retenção e o valor dos clientes", ownerId: manager.id, scope: "AGENCY", period: "current", status: "ACTIVE",
    description: "Conversar com cada cliente sobre resultado antes de renovar o contrato.",
    keyResults: [
      {
        title: "Reuniões de resultado realizadas", kind: "MANUAL", unit: "reuniões", start: 0, target: Math.max(1, resultMeetingsPlanned),
        readings: [{ value: resultMeetingsHeld, on: monday(0, currentStart), confidence: "ON_TRACK", note: "Reuniões de outubro já marcadas com todos os clientes." }],
      },
      {
        title: "Clientes com renovação confirmada até 30/11", kind: "MANUAL", unit: "clientes", start: 0, target: clients.length,
        readings: [{ value: 0, on: monday(0, currentStart), confidence: "ON_TRACK", note: "Conversas de renovação começam depois das reuniões de resultado." }],
      },
    ],
  });
  addObjective({
    title: "Entregar vídeo no prazo", ownerId: sectorLeader("video"), scope: "SECTOR", sectorId: input.sectorIds.video, parentId: agencyNow, period: "current", status: "ACTIVE",
    description: "Edição com folga para revisão, principalmente nos projetos de lançamento.",
    keyResults: [
      { title: "Vídeos no prazo", kind: "KPI", metric: "ON_TIME_RATE", start: prevVideo.ON_TIME_RATE.value ?? 0.7, target: pct(Math.max(0.85, (prevVideo.ON_TIME_RATE.value ?? 0.7) + 0.12)) },
    ],
  });
  addObjective({
    title: "Acertar a arte de primeira", ownerId: sectorLeader("design"), scope: "SECTOR", sectorId: input.sectorIds.design, parentId: agencyNow, period: "current", status: "ACTIVE",
    description: "Briefing com referência e checklist antes de a demanda ir para o setor.",
    keyResults: [
      { title: "Artes que voltaram para ajuste", kind: "KPI", metric: "REWORK_RATE", start: prevDesign.REWORK_RATE.value ?? 0.2, target: pct(Math.max(0.1, (prevDesign.REWORK_RATE.value ?? 0.2) - 0.05)) },
    ],
  });

  // Avisos --------------------------------------------------------------
  const announce = (title: string, message: string, kind: "INFO" | "CELEBRATION" | "URGENT", from: string, to: string) => {
    if (at(from, 9) > nowMs) return;
    plan.announcements.push({
      id: nextId("announce"), title, message, kind,
      startsAt: new Date(at(from, 9)), endsAt: new Date(at(to, 18)),
      active: at(to, 18) >= nowMs, authorId: manager.id,
      createdAt: new Date(at(from, 9)), updatedAt: new Date(at(from, 9)),
    });
  };
  if (terra) {
    announce("Bem-vinda, Terra Viva Imóveis", "Novo cliente do Plano Completo. O kickoff é hoje, às 10h, e o lançamento do Vista Verde marca o ritmo das próximas semanas.", "INFO", terra.spec.startedOn, addDays(terra.spec.startedOn, 10));
  }
  announce("Feriado de 7 de setembro", "Sem expediente na segunda. Urgências de cliente passam pelo plantão da gestão.", "INFO", "2026-09-03", "2026-09-08");
  const prevOnTimeLabel = Math.round(prevOnTime * 100);
  announce(`Fechamos o trimestre com ${prevOnTimeLabel}% das entregas no prazo`, `Foram ${prevCompleted} entregas no trimestre. Parabéns, time — a retrospectiva está na agenda de hoje.`, "CELEBRATION", currentStart, addDays(currentStart, 7));
  announce("Metas e OKRs do novo trimestre no ar", "Confira a aba Performance. Atualizem os check-ins dos seus resultados-chave toda segunda-feira.", "INFO", nextBusinessDay(currentStart), addDays(currentStart, 14));

  plan.summary = {
    clientes: plan.clients.length,
    demandas: plan.demands.length,
    sessoes: plan.sessions.length,
    entregasTrimestreAnterior: prevCompleted,
    noPrazoTrimestreAnterior: `${Math.round(prevOnTime * 100)}%`,
    retrabalhoTrimestreAnterior: `${Math.round(prevRework * 100)}%`,
    entregasTrimestreAtual: curNow.COMPLETED.value ?? 0,
  };
  return plan;
}

function max(a: string, b: string) {
  return a > b ? a : b;
}

function dedupe(list: SimMember[]): SimMember[] {
  const seen = new Set<string>();
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

export type { Rng };
