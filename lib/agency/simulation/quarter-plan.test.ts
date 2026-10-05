import { DemandStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { demandCycleViolations } from "@/lib/agency/demand-cycle";
import { planQuarter, type SimInput, type SimMember } from "./quarter-plan";

const NOW = new Date("2026-10-05T18:00:00.000Z"); // segunda, 15h em São Paulo

const TEAM: SimMember[] = [
  { id: "u-admin", name: "Admin", userType: "ADMIN", sectorSlug: null },
  { id: "u-gestao", name: "Gestora", userType: "MANAGEMENT", sectorSlug: null },
  { id: "u-social", name: "Social", userType: "SOCIAL_MEDIA", sectorSlug: "social" },
  { id: "u-design", name: "Designer", userType: "DESIGNER", sectorSlug: "design" },
  { id: "u-videomaker", name: "Videomaker", userType: "VIDEOMAKER", sectorSlug: "video" },
  { id: "u-editor", name: "Editor", userType: "VIDEO_EDITOR", sectorSlug: "video" },
  { id: "u-trafego", name: "Tráfego", userType: "OTHER", sectorSlug: "trafego" },
];

const INPUT: SimInput = {
  now: NOW,
  team: TEAM,
  sectorIds: { social: "s-social", design: "s-design", video: "s-video", trafego: "s-trafego" },
  contentTypeIds: { estatico: "ct-1", carrossel: "ct-2", stories: "ct-3", reels: "ct-4", video: "ct-5" },
  priorityIds: { Baixa: "p-1", Média: "p-2", Alta: "p-3", Urgente: "p-4" },
};

const plan = planQuarter(INPUT);
const nowMs = NOW.getTime();
const startMs = Date.parse("2026-07-01T03:00:00.000Z");

describe("planQuarter", () => {
  it("é determinístico para a mesma semente", () => {
    const again = planQuarter(INPUT);
    expect(again.demands.map((d) => [d.id, d.status, d.assigneeId])).toEqual(
      plan.demands.map((d) => [d.id, d.status, d.assigneeId])
    );
    expect(planQuarter({ ...INPUT, seed: 7 }).demands.map((d) => d.status)).not.toEqual(
      plan.demands.map((d) => d.status)
    );
  });

  it("cobre o trimestre anterior inteiro e o começo do atual", () => {
    expect(plan.period).toEqual({ startsOn: "2026-07-01", endsOn: "2026-12-31" });
    expect(plan.clients).toHaveLength(5);
    expect(plan.demands.length).toBeGreaterThan(250);
    expect(plan.demands.length).toBeLessThan(450);
  });

  it("toda demanda respeita o ciclo de vida do sistema", () => {
    for (const d of plan.demands) {
      const violations = demandCycleViolations({
        status: d.status as DemandStatus,
        boardColumn: d.boardColumn as string,
        title: d.title,
        briefingLockedAt: (d.briefingLockedAt as Date | null) ?? null,
        description: d.description as string,
        format: d.format as string | null,
        orientation: d.orientation as string | null,
        durationSeconds: d.durationSeconds as number | null,
        demandType: d.type as string,
        contentTypeSlug: d.type === "REEL" || d.type === "VIDEO" ? "reels" : null,
        sectorId: d.sectorId as string | null,
        assigneeId: d.assigneeId as string | null,
        materialUrl: d.materialUrl as string | null,
        publishedUrl: d.publishedUrl as string | null,
        visibleToClient: d.visibleToClient as boolean,
      });
      expect(violations, d.title).toEqual([]);
    }
  });

  it("nada acontece no futuro nem antes do trimestre", () => {
    for (const d of plan.demands) {
      for (const field of ["createdAt", "productionStartedAt", "productionCompletedAt", "publishedAt", "updatedAt"] as const) {
        const value = d[field] as Date | null | undefined;
        if (!value) continue;
        expect(value.getTime(), `${d.title} ${field}`).toBeLessThanOrEqual(nowMs);
        expect(value.getTime(), `${d.title} ${field}`).toBeGreaterThanOrEqual(startMs);
      }
    }
    for (const s of plan.sessions) {
      expect((s.endedAt as Date).getTime()).toBeLessThanOrEqual(nowMs);
      expect((s.endedAt as Date).getTime()).toBeGreaterThan((s.startedAt as Date).getTime());
    }
    for (const c of plan.comments) expect((c.createdAt as Date).getTime()).toBeLessThanOrEqual(nowMs);
    for (const n of plan.notifications) expect((n.createdAt as Date).getTime()).toBeLessThanOrEqual(nowMs);
  });

  it("ninguém trabalha em duas coisas ao mesmo tempo", () => {
    const byUser = new Map<string, { s: number; e: number }[]>();
    for (const s of plan.sessions) {
      const list = byUser.get(s.userId) ?? [];
      list.push({ s: (s.startedAt as Date).getTime(), e: (s.endedAt as Date).getTime() });
      byUser.set(s.userId, list);
    }
    for (const list of Array.from(byUser.values())) {
      list.sort((a, b) => a.s - b.s);
      for (let i = 1; i < list.length; i += 1) expect(list[i].s).toBeGreaterThanOrEqual(list[i - 1].e);
    }
  });

  it("horas trabalhadas cabem em um expediente", () => {
    const perDay = new Map<string, number>();
    for (const s of plan.sessions) {
      const day = new Date((s.startedAt as Date).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
      const key = `${s.userId}|${day}`;
      perDay.set(key, (perDay.get(key) ?? 0) + (s.totalActiveSeconds as number));
    }
    for (const seconds of Array.from(perDay.values())) expect(seconds).toBeLessThanOrEqual(8 * 3600);
  });

  it("só usa pessoas do elenco informado", () => {
    const ids = new Set(TEAM.map((m) => m.id));
    for (const d of plan.demands) {
      for (const id of [d.assigneeId, d.requesterId]) if (id) expect(ids.has(id as string)).toBe(true);
    }
    for (const t of [...plan.sessions, ...plan.comments, ...plan.notifications, ...plan.checkIns]) {
      const id = ("userId" in t ? t.userId : "authorId" in t ? t.authorId : null) as string | null;
      if (id) expect(ids.has(id)).toBe(true);
    }
  });

  it("as demandas se relacionam com cliente, quadro e competência do mesmo cliente", () => {
    const boardClient = new Map(plan.boards.map((b) => [b.id, b.clientId]));
    const competenceBoard = new Map(plan.competences.map((c) => [c.id, c.boardId]));
    for (const d of plan.demands) {
      expect(boardClient.get(d.boardId as string)).toBe(d.clientId);
      if (d.competenceId) expect(competenceBoard.get(d.competenceId)).toBe(d.boardId);
    }
  });

  it("os indicadores do trimestre anterior são plausíveis", () => {
    const summary = plan.summary;
    const onTime = Number(String(summary.noPrazoTrimestreAnterior).replace("%", ""));
    const rework = Number(String(summary.retrabalhoTrimestreAnterior).replace("%", ""));
    expect(Number(summary.entregasTrimestreAnterior)).toBeGreaterThan(200);
    expect(onTime).toBeGreaterThanOrEqual(65);
    expect(onTime).toBeLessThanOrEqual(92);
    expect(rework).toBeGreaterThanOrEqual(12);
    expect(rework).toBeLessThanOrEqual(35);
  });

  it("deixa o quadro de hoje vivo: de tudo um pouco, sem exagero de atraso", () => {
    const count = (s: string) => plan.demands.filter((d) => d.status === s).length;
    expect(count("PENDING_PLANNING") + count("PLANNING")).toBeGreaterThan(0);
    expect(count("IN_PRODUCTION")).toBeGreaterThan(0);
    expect(count("PUBLISHED")).toBeGreaterThan(200);
    const open = plan.demands.filter((d) => !["PUBLISHED", "DONE"].includes(d.status as string));
    const overdue = open.filter((d) => (d.dueDate as Date).getTime() < nowMs);
    expect(overdue.length).toBeLessThanOrEqual(12);
  });

  it("metas e OKRs: trimestre anterior encerrado, atual em andamento", () => {
    expect(plan.goals.length).toBeGreaterThanOrEqual(8);
    const done = plan.objectives.filter((o) => o.status === "DONE");
    const active = plan.objectives.filter((o) => o.status === "ACTIVE");
    expect(done.length).toBeGreaterThan(0);
    expect(active.length).toBeGreaterThan(0);
    for (const o of plan.objectives) expect(plan.keyResults.some((k) => k.objectiveId === o.id)).toBe(true);
    for (const kr of plan.keyResults) {
      if (kr.kind === "MANUAL") expect(plan.checkIns.some((c) => c.keyResultId === kr.id)).toBe(true);
    }
    const ids = new Set(plan.objectives.map((o) => o.id));
    for (const o of plan.objectives) if (o.parentId) expect(ids.has(o.parentId as string)).toBe(true);
  });

  it("recusa montar a história sem a equipe mínima", () => {
    expect(() => planQuarter({ ...INPUT, team: TEAM.filter((m) => m.sectorSlug !== "design") })).toThrow(/Design/);
  });

  it("sem tráfego no elenco, a simulação segue sem demandas de tráfego", () => {
    const noTraffic = planQuarter({ ...INPUT, team: TEAM.filter((m) => m.sectorSlug !== "trafego"), sectorIds: { ...INPUT.sectorIds, trafego: undefined } });
    expect(noTraffic.demands.some((d) => d.type === "OTHER")).toBe(false);
  });
});
