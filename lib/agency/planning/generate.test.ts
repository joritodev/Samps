import { describe, expect, it } from "vitest";
import { planDuplicateWeek, planWeekFromTemplates } from "./generate";
import type { PlanCardData, PlanTemplateData } from "./types";

const WEEK = { year: 2026, week: 38 };

const template = (t: Partial<PlanTemplateData> & { id: string }): PlanTemplateData => ({
  clientId: "c1",
  clientName: "COCO BAMBU",
  title: "Vídeo",
  kind: "video",
  category: "Orgânico",
  durationHours: 2,
  weeklyQuantity: 1,
  preferredMemberId: null,
  preferredWeekday: null,
  required: true,
  active: true,
  sortOrder: 0,
  ...t,
});

describe("planWeekFromTemplates", () => {
  it("gera um card por unidade semanal e numera quando há mais de um", () => {
    const rows = planWeekFromTemplates(WEEK, [template({ id: "t1", weeklyQuantity: 3 })], []);
    expect(rows.map((r) => r.title)).toEqual(["Vídeo 1", "Vídeo 2", "Vídeo 3"]);
    expect(rows.every((r) => r.isoYear === 2026 && r.isoWeek === 38)).toBe(true);
    expect(rows.every((r) => r.recurring && r.templateId === "t1")).toBe(true);
  });

  it("só completa o que falta (idempotente)", () => {
    const t = template({ id: "t1", weeklyQuantity: 3 });
    const first = planWeekFromTemplates(WEEK, [t], []);
    const existing = first.slice(0, 2).map((r) => ({ templateId: r.templateId }));
    const again = planWeekFromTemplates(WEEK, [t], existing);
    expect(again).toHaveLength(1);
    expect(again[0]!.title).toBe("Vídeo 3");
    expect(planWeekFromTemplates(WEEK, [t], first)).toHaveLength(0);
  });

  it("modelo com dia e pessoa já nasce programado e fixo; sem isso, não alocado", () => {
    const [fixed] = planWeekFromTemplates(
      WEEK,
      [template({ id: "t1", preferredMemberId: "leo", preferredWeekday: 2 })],
      [],
    );
    expect(fixed).toMatchObject({ status: "PROGRAMADO", pinned: true, weekday: 2, memberId: "leo" });
    const [loose] = planWeekFromTemplates(WEEK, [template({ id: "t2" })], []);
    expect(loose).toMatchObject({ status: "NAO_ALOCADO", pinned: false, weekday: null });
  });

  it("ignora modelo inativo", () => {
    expect(planWeekFromTemplates(WEEK, [template({ id: "t1", active: false })], [])).toEqual([]);
  });
});

const prev = (c: Partial<PlanCardData> & { id: string }): PlanCardData => ({
  isoYear: 2026,
  isoWeek: 37,
  weekday: 2,
  memberId: "leo",
  kind: "video",
  clientId: null,
  clientName: "COCO BAMBU",
  demandId: null,
  templateId: "t1",
  title: "Vídeo",
  category: "Orgânico",
  durationHours: 2,
  status: "CONCLUIDO",
  pinned: true,
  required: true,
  recurring: true,
  dueDate: "2026-09-10",
  notes: "n",
  position: 0,
  ...c,
});

describe("planDuplicateWeek", () => {
  it("copia só recorrentes, reabre o status e limpa o prazo", () => {
    const rows = planDuplicateWeek(
      WEEK,
      [prev({ id: "a" }), prev({ id: "b", recurring: false, title: "avulso" })],
      [],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      isoWeek: 38,
      status: "PROGRAMADO",
      dueDate: null,
      demandId: null,
      notes: "n",
    });
  });

  it("não duplica o que já existe na semana", () => {
    const existing = [prev({ id: "x", isoWeek: 38 })];
    expect(planDuplicateWeek(WEEK, [prev({ id: "a" })], existing)).toEqual([]);
  });

  it("card sem dia ou pessoa volta como não alocado", () => {
    const [row] = planDuplicateWeek(WEEK, [prev({ id: "a", weekday: null })], []);
    expect(row!.status).toBe("NAO_ALOCADO");
  });
});
