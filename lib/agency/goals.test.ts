import { describe, expect, it } from "vitest";
import {
  canViewGoal,
  describeTarget,
  endedRecently,
  evaluateGoal,
  goalPeriodState,
  parseGoalInput,
  metricUnitSuffix,
  periodsOverlap,
  presetPeriod,
  type GoalInput,
} from "./goals";

const base: GoalInput = {
  metric: "ON_TIME_RATE",
  scope: "AGENCY",
  target: 0.85,
  startsOn: "2026-10-01",
  endsOn: "2026-12-31",
};

describe("parseGoalInput", () => {
  it("aceita meta da agência e alinha o período aos dias de SP", () => {
    const r = parseGoalInput(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ metric: "ON_TIME_RATE", scope: "AGENCY", sectorId: null, userId: null, warnMargin: 0.1, note: null });
    expect(r.value.startsOn.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(r.value.endsOn.toISOString()).toBe("2027-01-01T02:59:59.999Z");
  });

  it("exige setor ou pessoa conforme o escopo e descarta o vínculo que não vale", () => {
    expect(parseGoalInput({ ...base, scope: "SECTOR" }).ok).toBe(false);
    expect(parseGoalInput({ ...base, scope: "USER" }).ok).toBe(false);
    const sector = parseGoalInput({ ...base, scope: "SECTOR", sectorId: "s1", userId: "u1" });
    expect(sector.ok && sector.value).toMatchObject({ sectorId: "s1", userId: null });
    const agency = parseGoalInput({ ...base, sectorId: "s1", userId: "u1" });
    expect(agency.ok && agency.value).toMatchObject({ sectorId: null, userId: null });
  });

  it("rejeita indicador e escopo desconhecidos", () => {
    expect(parseGoalInput({ ...base, metric: "X" }).ok).toBe(false);
    expect(parseGoalInput({ ...base, scope: "TEAM" }).ok).toBe(false);
  });

  it("valida o valor", () => {
    expect(parseGoalInput({ ...base, target: -1 }).ok).toBe(false);
    expect(parseGoalInput({ ...base, target: Number.NaN }).ok).toBe(false);
    expect(parseGoalInput({ ...base, target: 1.2 }).ok).toBe(false);
    expect(parseGoalInput({ ...base, metric: "COMPLETED", target: 40 }).ok).toBe(true);
    expect(parseGoalInput({ ...base, metric: "OVERDUE", target: 0 }).ok).toBe(true);
  });

  it("valida margem, datas e observação", () => {
    expect(parseGoalInput({ ...base, warnMargin: 1.5 }).ok).toBe(false);
    expect(parseGoalInput({ ...base, startsOn: "2026-02-31" }).ok).toBe(false);
    expect(parseGoalInput({ ...base, startsOn: "2026-12-31", endsOn: "2026-10-01" }).ok).toBe(false);
    expect(parseGoalInput({ ...base, note: "x".repeat(201) }).ok).toBe(false);
    expect(parseGoalInput({ ...base, startsOn: "2026-10-01", endsOn: "2026-10-01" }).ok).toBe(true);
  });
});

describe("evaluateGoal", () => {
  it("maior é melhor", () => {
    expect(evaluateGoal("ON_TIME_RATE", 0.85, 0.1, 0.9)).toMatchObject({ status: "met", progress: 1 });
    expect(evaluateGoal("ON_TIME_RATE", 0.85, 0.1, 0.8).status).toBe("near");
    expect(evaluateGoal("ON_TIME_RATE", 0.85, 0.1, 0.6).status).toBe("off");
    expect(evaluateGoal("COMPLETED", 40, 0.1, 20).progress).toBe(0.5);
  });
  it("acumulado no meio do período compara com o ritmo", () => {
    // 11 de 320 no 5º dia de 92: no ritmo (alvo proporcional ≈ 17), ainda abaixo.
    expect(evaluateGoal("COMPLETED", 320, 0.1, 11, 5 / 92).status).toBe("off");
    expect(evaluateGoal("COMPLETED", 320, 0.1, 20, 5 / 92).status).toBe("pace");
    expect(evaluateGoal("COMPLETED", 320, 0.1, 160, 0.5).status).toBe("pace");
    expect(evaluateGoal("COMPLETED", 320, 0.1, 150, 0.5).status).toBe("near");
    expect(evaluateGoal("COMPLETED", 320, 0.1, 100, 0.5).status).toBe("off");
    expect(evaluateGoal("COMPLETED", 320, 0.1, 320, 0.5).status).toBe("met");
    // Encerrada (ritmo 1): o alvo inteiro vale.
    expect(evaluateGoal("COMPLETED", 320, 0.1, 160, 1).status).toBe("off");
  });
  it("taxas e médias não seguem o ritmo", () => {
    expect(evaluateGoal("ON_TIME_RATE", 0.9, 0.1, 0.5, 0.1).status).toBe("off");
  });
  it("menor é melhor", () => {
    expect(evaluateGoal("OVERDUE", 5, 0.2, 5).status).toBe("met");
    expect(evaluateGoal("OVERDUE", 5, 0.2, 6).status).toBe("near");
    expect(evaluateGoal("OVERDUE", 5, 0.2, 10)).toMatchObject({ status: "off", progress: 0.5 });
  });
  it("alvo zero", () => {
    expect(evaluateGoal("OVERDUE", 0, 0.1, 0).status).toBe("met");
    expect(evaluateGoal("OVERDUE", 0, 0.1, 1)).toMatchObject({ status: "off", progress: 0 });
    expect(evaluateGoal("COMPLETED", 0, 0.1, 0).status).toBe("met");
  });
  it("sem leitura", () => {
    expect(evaluateGoal("ON_TIME_RATE", 0.85, 0.1, null)).toEqual({ status: "none", progress: null });
  });
});

describe("textos e período", () => {
  it("descreve o alvo com a direção do indicador", () => {
    expect(describeTarget("ON_TIME_RATE", 0.85)).toBe("≥ 85%");
    expect(describeTarget("OVERDUE", 5)).toBe("≤ 5");
    expect(describeTarget("AVG_LEAD_TIME_DAYS", 3.5)).toBe("≤ 3,5 dias");
  });
  it("estado do período", () => {
    const g = { startsOn: new Date("2026-10-01T03:00:00Z"), endsOn: new Date("2026-10-31T02:59:59Z") };
    expect(goalPeriodState(g, new Date("2026-09-30T00:00:00Z"))).toBe("upcoming");
    expect(goalPeriodState(g, new Date("2026-10-15T00:00:00Z"))).toBe("running");
    expect(goalPeriodState(g, new Date("2026-11-02T00:00:00Z"))).toBe("ended");
  });
  it("sobreposição", () => {
    const a = { startsOn: new Date("2026-10-01"), endsOn: new Date("2026-10-31") };
    expect(periodsOverlap(a, { startsOn: new Date("2026-10-31"), endsOn: new Date("2026-11-30") })).toBe(true);
    expect(periodsOverlap(a, { startsOn: new Date("2026-11-01"), endsOn: new Date("2026-11-30") })).toBe(false);
  });
});

describe("canViewGoal", () => {
  const viewer = { id: "u1", sectorId: "s1", canManage: false };
  it("gerente vê tudo", () => {
    expect(canViewGoal({ scope: "USER", sectorId: null, userId: "x" }, { ...viewer, canManage: true })).toBe(true);
  });
  it("os demais veem agência, o próprio setor e as próprias", () => {
    expect(canViewGoal({ scope: "AGENCY", sectorId: null, userId: null }, viewer)).toBe(true);
    expect(canViewGoal({ scope: "SECTOR", sectorId: "s1", userId: null }, viewer)).toBe(true);
    expect(canViewGoal({ scope: "SECTOR", sectorId: "s2", userId: null }, viewer)).toBe(false);
    expect(canViewGoal({ scope: "USER", sectorId: null, userId: "u1" }, viewer)).toBe(true);
    expect(canViewGoal({ scope: "USER", sectorId: null, userId: "u2" }, viewer)).toBe(false);
    expect(canViewGoal({ scope: "SECTOR", sectorId: "s1", userId: null }, { ...viewer, sectorId: null })).toBe(false);
  });
});

describe("presetPeriod", () => {
  it("mês e trimestre inteiros, no dia de SP", () => {
    const now = new Date("2026-11-15T15:00:00Z");
    expect(presetPeriod("month", now)).toEqual({ startsOn: "2026-11-01", endsOn: "2026-11-30" });
    expect(presetPeriod("quarter", now)).toEqual({ startsOn: "2026-10-01", endsOn: "2026-12-31" });
    expect(presetPeriod("month", new Date("2028-02-10T15:00:00Z")).endsOn).toBe("2028-02-29");
    expect(presetPeriod("quarter", new Date("2026-03-31T15:00:00Z"))).toEqual({ startsOn: "2026-01-01", endsOn: "2026-03-31" });
  });
  it("virada do dia em UTC ainda é o dia de SP", () => {
    expect(presetPeriod("month", new Date("2026-12-01T01:00:00Z")).startsOn).toBe("2026-11-01");
  });
});

describe("metricUnitSuffix", () => {
  it("sufixo por unidade", () => {
    expect(metricUnitSuffix("ON_TIME_RATE")).toBe("%");
    expect(metricUnitSuffix("WORKED_HOURS")).toBe("h");
    expect(metricUnitSuffix("AVG_LEAD_TIME_DAYS")).toBe("dias");
    expect(metricUnitSuffix("OVERDUE")).toBe("demandas");
  });
});

describe("endedRecently", () => {
  const goal = { endsOn: new Date("2026-12-31T23:59:59Z") };
  it("só nos 2 dias depois do fim", () => {
    expect(endedRecently(goal, new Date("2026-12-31T12:00:00Z"))).toBe(false); // ainda não acabou
    expect(endedRecently(goal, new Date("2027-01-01T12:00:00Z"))).toBe(true);
    expect(endedRecently(goal, new Date("2027-01-02T12:00:00Z"))).toBe(true);
    expect(endedRecently(goal, new Date("2027-01-04T12:00:00Z"))).toBe(false);
  });
});
