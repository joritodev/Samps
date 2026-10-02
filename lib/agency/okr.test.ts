import { describe, expect, it } from "vitest";
import { dayKey, endOfDayMs, startOfDayMs } from "./sp-calendar";
import {
  canBeParent,
  canViewObjective,
  computedConfidence,
  expectedProgress,
  keyResultConfidence,
  keyResultProgress,
  nextPeriod,
  objectiveProgress,
  parseCheckInInput,
  parseKeyResultInput,
  parseObjectiveInput,
  worstConfidence,
  type ObjectiveInput,
} from "./okr";

describe("progresso", () => {
  it("sobe e desce, limitado a 0–1", () => {
    expect(keyResultProgress(70, 90, 80)).toBe(0.5);
    expect(keyResultProgress(70, 90, 100)).toBe(1);
    expect(keyResultProgress(70, 90, 50)).toBe(0);
    expect(keyResultProgress(20, 5, 10)).toBeCloseTo(10 / 15);
    expect(keyResultProgress(20, 5, 3)).toBe(1);
  });
  it("sem valor atual ou alvo igual ao inicial não tem leitura", () => {
    expect(keyResultProgress(0, 10, null)).toBeNull();
    expect(keyResultProgress(5, 5, 5)).toBeNull();
  });
  it("objetivo é a média dos resultados com leitura", () => {
    expect(objectiveProgress([0.5, 1, null])).toBe(0.75);
    expect(objectiveProgress([null, null])).toBeNull();
    expect(objectiveProgress([])).toBeNull();
  });
});

describe("ritmo e confiança", () => {
  const period = { startsOn: new Date("2026-10-01T03:00:00Z"), endsOn: new Date("2026-12-31T02:59:59.999Z") };
  it("fração decorrida do período", () => {
    expect(expectedProgress(period, new Date("2026-09-01"))).toBe(0);
    expect(expectedProgress(period, new Date("2027-02-01"))).toBe(1);
    expect(expectedProgress(period, new Date("2026-11-15T15:00:00Z"))).toBeCloseTo(0.5, 1);
  });
  it("confiança pelo atraso sobre o esperado", () => {
    expect(computedConfidence(0.45, 0.5)).toBe("ON_TRACK");
    expect(computedConfidence(0.3, 0.5)).toBe("AT_RISK");
    expect(computedConfidence(0.1, 0.5)).toBe("OFF_TRACK");
    expect(computedConfidence(1, 1)).toBe("ON_TRACK");
    expect(computedConfidence(null, 0.5)).toBeNull();
  });
  it("check-in manual vale mais que o cálculo", () => {
    expect(keyResultConfidence({ kind: "MANUAL", progress: 0.1, expected: 0.5, lastCheckIn: "ON_TRACK" })).toBe("ON_TRACK");
    expect(keyResultConfidence({ kind: "MANUAL", progress: 0.1, expected: 0.5, lastCheckIn: null })).toBe("OFF_TRACK");
    expect(keyResultConfidence({ kind: "KPI", progress: 0.1, expected: 0.5, lastCheckIn: "ON_TRACK" })).toBe("OFF_TRACK");
  });
  it("a pior confiança manda no objetivo", () => {
    expect(worstConfidence(["ON_TRACK", "OFF_TRACK", null, "AT_RISK"])).toBe("OFF_TRACK");
    expect(worstConfidence([null])).toBeNull();
  });
});

describe("cascata e visibilidade", () => {
  it("pai tem escopo mais amplo", () => {
    expect(canBeParent("AGENCY", "SECTOR")).toBe(true);
    expect(canBeParent("AGENCY", "USER")).toBe(true);
    expect(canBeParent("SECTOR", "USER")).toBe(true);
    expect(canBeParent("SECTOR", "SECTOR")).toBe(false);
    expect(canBeParent("USER", "SECTOR")).toBe(false);
  });
  it("quem vê o quê", () => {
    const viewer = { id: "u1", sectorId: "s1", canManage: false };
    const o = (over: object) => ({ scope: "AGENCY", sectorId: null, userId: null, ownerId: "x", ...over });
    expect(canViewObjective(o({}), viewer)).toBe(true);
    expect(canViewObjective(o({ scope: "SECTOR", sectorId: "s1" }), viewer)).toBe(true);
    expect(canViewObjective(o({ scope: "SECTOR", sectorId: "s2" }), viewer)).toBe(false);
    expect(canViewObjective(o({ scope: "SECTOR", sectorId: "s2", ownerId: "u1" }), viewer)).toBe(true);
    expect(canViewObjective(o({ scope: "USER", userId: "u1" }), viewer)).toBe(true);
    expect(canViewObjective(o({ scope: "USER", userId: "u2" }), viewer)).toBe(false);
    expect(canViewObjective(o({ scope: "USER", userId: "u2" }), { ...viewer, canManage: true })).toBe(true);
  });
});

const obj: ObjectiveInput = { title: "Entregar com consistência", ownerId: "m1", scope: "AGENCY", startsOn: "2026-10-01", endsOn: "2026-12-31" };

describe("parseObjectiveInput", () => {
  it("aceita e alinha o período a SP", () => {
    const r = parseObjectiveInput(obj);
    expect(r.ok && r.value.startsOn.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(r.ok && r.value).toMatchObject({ sectorId: null, userId: null, parentId: null, description: null });
  });
  it("valida título, dono, escopo e período", () => {
    expect(parseObjectiveInput({ ...obj, title: "  " }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, title: "x".repeat(141) }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, ownerId: "" }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, scope: "SECTOR" }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, scope: "USER" }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, scope: "X" }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, endsOn: "2026-09-01" }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, startsOn: "2026-02-31" }).ok).toBe(false);
    expect(parseObjectiveInput({ ...obj, description: "x".repeat(601) }).ok).toBe(false);
  });
  it("descarta o vínculo que não vale para o escopo", () => {
    const r = parseObjectiveInput({ ...obj, scope: "SECTOR", sectorId: "s1", userId: "u1" });
    expect(r.ok && r.value).toMatchObject({ sectorId: "s1", userId: null });
  });
});

describe("parseKeyResultInput", () => {
  const kr = { title: "Pontualidade", kind: "KPI", metric: "ON_TIME_RATE", startValue: 0.7, targetValue: 0.9 };
  it("KPI exige indicador; manual não tem indicador", () => {
    expect(parseKeyResultInput(kr).ok).toBe(true);
    expect(parseKeyResultInput({ ...kr, metric: "X" }).ok).toBe(false);
    const manual = parseKeyResultInput({ ...kr, kind: "MANUAL", metric: "ON_TIME_RATE", unit: "clientes", startValue: 0, targetValue: 3 });
    expect(manual.ok && manual.value).toMatchObject({ metric: null, unit: "clientes" });
  });
  it("valida valores", () => {
    expect(parseKeyResultInput({ ...kr, targetValue: 0.7 }).ok).toBe(false);
    expect(parseKeyResultInput({ ...kr, targetValue: 1.5 }).ok).toBe(false);
    expect(parseKeyResultInput({ ...kr, startValue: Number.NaN }).ok).toBe(false);
    expect(parseKeyResultInput({ ...kr, kind: "MANUAL", startValue: -1, targetValue: 3 }).ok).toBe(false);
    expect(parseKeyResultInput({ ...kr, title: "" }).ok).toBe(false);
    expect(parseKeyResultInput({ ...kr, kind: "OUTRO" }).ok).toBe(false);
    expect(parseKeyResultInput({ ...kr, kind: "MANUAL", unit: "x".repeat(25), startValue: 0, targetValue: 3 }).ok).toBe(false);
  });
  it("meta que desce é válida", () => {
    expect(parseKeyResultInput({ title: "Atrasos", kind: "KPI", metric: "OVERDUE", startValue: 20, targetValue: 5 }).ok).toBe(true);
  });
});

describe("parseCheckInInput", () => {
  it("valida valor, confiança e nota", () => {
    expect(parseCheckInInput({ value: 2, confidence: "AT_RISK", note: " ok " })).toEqual({ ok: true, value: { value: 2, confidence: "AT_RISK", note: "ok" } });
    expect(parseCheckInInput({ value: -1, confidence: "AT_RISK" }).ok).toBe(false);
    expect(parseCheckInInput({ value: 1, confidence: "X" }).ok).toBe(false);
    expect(parseCheckInInput({ value: 1, confidence: "ON_TRACK", note: "x".repeat(301) }).ok).toBe(false);
  });
});

describe("nextPeriod", () => {
  const sp = (from: string, to: string) => ({ startsOn: new Date(startOfDayMs(from)), endsOn: new Date(endOfDayMs(to)) });
  const keys = (p: { startsOn: Date; endsOn: Date }) => [dayKey(p.startsOn), dayKey(p.endsOn)];

  it("trimestre inteiro vira o trimestre seguinte, inclusive na virada de ano", () => {
    expect(keys(nextPeriod(sp("2026-10-01", "2026-12-31")))).toEqual(["2027-01-01", "2027-03-31"]);
    expect(keys(nextPeriod(sp("2026-01-01", "2026-03-31")))).toEqual(["2026-04-01", "2026-06-30"]);
  });
  it("mês inteiro vira o mês seguinte", () => {
    expect(keys(nextPeriod(sp("2026-01-01", "2026-01-31")))).toEqual(["2026-02-01", "2026-02-28"]);
    expect(keys(nextPeriod(sp("2026-12-01", "2026-12-31")))).toEqual(["2027-01-01", "2027-01-31"]);
  });
  it("intervalo livre anda com o mesmo tamanho", () => {
    expect(keys(nextPeriod(sp("2026-10-05", "2026-10-11")))).toEqual(["2026-10-12", "2026-10-18"]);
    expect(keys(nextPeriod(sp("2026-02-01", "2026-04-30")))).toEqual(["2026-05-01", "2026-07-28"]);
  });
});
