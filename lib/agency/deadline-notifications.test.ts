import { describe, expect, it } from "vitest";
import { demandFilterHref } from "@/lib/agency/demand-filters";
import {
  UNASSIGNED_LINK,
  planUnassignedOverdueDigest,
  calendarDay,
  daysUntil,
  dedupePlanned,
  planDeadlineNotification,
  type DeadlineCandidate,
} from "@/lib/agency/deadline-notifications";

// 2 out 2026, 08:00 em São Paulo (11:00 UTC)
const now = new Date("2026-10-02T11:00:00Z");
const due = (iso: string): DeadlineCandidate => ({
  id: "d1",
  title: "Reel depoimento",
  dueDate: new Date(iso),
  assigneeId: "u1",
  clientName: "Bella Clinic",
});

describe("dia de calendário em São Paulo", () => {
  it("usa o dia local, não o UTC", () => {
    // 01:00 UTC de 3 out ainda é 22:00 de 2 out em São Paulo
    expect(daysUntil(new Date("2026-10-03T01:00:00Z"), now)).toBe(0);
    expect(daysUntil(new Date("2026-10-03T12:00:00Z"), now)).toBe(1);
    expect(calendarDay(new Date("2026-10-02T02:59:00Z"))).toBe(calendarDay(new Date("2026-10-01T12:00:00Z")));
  });
});

describe("planDeadlineNotification", () => {
  it("avisa 'amanhã' e 'hoje', como prazo próximo", () => {
    expect(planDeadlineNotification(due("2026-10-03T18:00:00Z"), now)).toMatchObject({
      type: "DEADLINE_NEAR",
      title: "Prazo amanhã",
      userId: "u1",
      link: "/demandas?abrir=d1",
      message: "Reel depoimento · Bella Clinic",
    });
    expect(planDeadlineNotification(due("2026-10-02T18:00:00Z"), now)?.title).toBe("Prazo hoje");
  });

  it("não avisa prazo distante", () => {
    expect(planDeadlineNotification(due("2026-10-04T18:00:00Z"), now)).toBeNull();
    expect(planDeadlineNotification(due("2026-10-20T18:00:00Z"), now)).toBeNull();
  });

  it("atraso: dia 1, depois a cada 3 dias", () => {
    const at = (iso: string) => planDeadlineNotification(due(iso), now);
    expect(at("2026-10-01T18:00:00Z")).toMatchObject({
      type: "DEMAND_OVERDUE",
      title: "Demanda atrasada",
    });
    expect(at("2026-09-28T18:00:00Z")?.title).toBe("Demanda atrasada há 4 dias");
    expect(at("2026-09-25T18:00:00Z")?.title).toBe("Demanda atrasada há 7 dias");
  });

  it("atraso fora do ritmo não avisa", () => {
    expect(planDeadlineNotification(due("2026-09-30T18:00:00Z"), now)).toBeNull(); // 2 dias
    expect(planDeadlineNotification(due("2026-09-29T18:00:00Z"), now)).toBeNull(); // 3 dias
  });

  it("para depois de 30 dias de atraso", () => {
    expect(planDeadlineNotification(due("2026-09-04T18:00:00Z"), now)?.title).toBe("Demanda atrasada há 28 dias");
    expect(planDeadlineNotification(due("2026-09-01T18:00:00Z"), now)).toBeNull(); // 31 dias: acima do limite
  });

  it("skipNear ignora prazo próximo mas mantém atraso", () => {
    expect(planDeadlineNotification(due("2026-10-03T18:00:00Z"), now, { skipNear: true })).toBeNull();
    expect(planDeadlineNotification(due("2026-10-01T18:00:00Z"), now, { skipNear: true })?.type).toBe("DEMAND_OVERDUE");
  });

  it("sem cliente a mensagem é só o título", () => {
    expect(planDeadlineNotification({ ...due("2026-10-03T18:00:00Z"), clientName: null }, now)?.message).toBe("Reel depoimento");
  });
});

describe("dedupePlanned", () => {
  it("remove repetição do mesmo usuário/tipo/demanda", () => {
    const n = planDeadlineNotification(due("2026-10-03T18:00:00Z"), now)!;
    expect(dedupePlanned([n, n, { ...n, userId: "u2" }])).toHaveLength(2);
  });
});

describe("planUnassignedOverdueDigest", () => {
  const demands = [
    { id: "a", title: "Reel antigo", clientId: "c1", dueDate: new Date("2026-09-27T18:00:00Z") }, // 5 dias
    { id: "b", title: "Banner", clientId: "c2", dueDate: new Date("2026-10-01T18:00:00Z") }, // 1 dia
    { id: "c", title: "Vence hoje", clientId: "c1", dueDate: new Date("2026-10-02T18:00:00Z") }, // hoje: não é atraso
  ];
  const all = { id: "m1", viewAll: true, clientIds: [] as string[] };

  it("link bate com o filtro 'sem responsável' do quadro", () => {
    expect(UNASSIGNED_LINK).toBe(demandFilterHref("sem-responsavel"));
  });

  it("um resumo por gestor, com contagem e a mais antiga; hoje não conta como atraso", () => {
    const [n, ...rest] = planUnassignedOverdueDigest(demands, [all], now);
    expect(rest).toHaveLength(0);
    expect(n).toMatchObject({
      userId: "m1",
      type: "DEMAND_OVERDUE",
      title: "2 demandas atrasadas sem responsável",
      message: "A mais antiga: Reel antigo, atrasada há 5 dias.",
      link: UNASSIGNED_LINK,
    });
  });

  it("singular para uma demanda e 'dia' no singular", () => {
    const [n] = planUnassignedOverdueDigest([demands[1]], [all], now);
    expect(n.title).toBe("1 demanda atrasada sem responsável");
    expect(n.message).toBe("A mais antiga: Banner, atrasada há 1 dia.");
  });

  it("gestor com escopo só conta os clientes dele; sem nenhum, não avisa", () => {
    const scoped = { id: "m2", viewAll: false, clientIds: ["c2"] };
    const none = { id: "m3", viewAll: false, clientIds: ["c9"] };
    const out = planUnassignedOverdueDigest(demands, [all, scoped, none], now);
    expect(out.map((o) => o.userId)).toEqual(["m1", "m2"]);
    expect(out[1].title).toBe("1 demanda atrasada sem responsável");
  });

  it("sem demandas atrasadas não gera nada", () => {
    expect(planUnassignedOverdueDigest([demands[2]], [all], now)).toEqual([]);
  });
});
