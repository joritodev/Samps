import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  sector: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  reportDelivery: { count: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  notification: { findFirst: vi.fn() },
}));
const sendEmail = vi.hoisted(() => vi.fn());
const getPerformanceSummary = vi.hoisted(() => vi.fn());
const listRunningGoals = vi.hoisted(() => vi.fn());
const evaluateGoals = vi.hoisted(() => vi.fn());
const listRunningObjectives = vi.hoisted(() => vi.fn());
const evaluateObjectives = vi.hoisted(() => vi.fn());
const createNotification = vi.hoisted(() => vi.fn());
const getPendingCheckIns = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/mail/send", () => ({ sendEmail, appUrl: (p: string) => `https://app.exemplo.com${p}` }));
vi.mock("@/lib/services/performance-summary.service", () => ({ getPerformanceSummary }));
vi.mock("@/lib/services/goals.service", () => ({ listRunningGoals, evaluateGoals }));
vi.mock("@/lib/services/okr.service", () => ({ listRunningObjectives, evaluateObjectives }));
vi.mock("@/lib/services/okr-reminders.service", () => ({ getPendingCheckIns }));
vi.mock("@/lib/services/notifications.service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/notifications.service")>("@/lib/services/notifications.service");
  return { ...actual, createNotification };
});

import { reportEmailsStatus, runReportEmails } from "./report-emails.service";

const MONDAY = new Date("2026-10-05T12:00:00Z");
const TUESDAY = new Date("2026-10-06T12:00:00Z");
const SATURDAY = new Date("2026-10-10T12:00:00Z");

const summary = {
  headline: "Frase", range: { from: new Date(), to: new Date() }, previousRange: { from: new Date(), to: new Date() },
  indicators: {
    COMPLETED: { key: "COMPLETED", label: "Concluídas", unit: "count", value: 2, previous: 1, delta: 1, deltaPct: 100, trend: "better", snapshot: false },
    ON_TIME_RATE: { key: "ON_TIME_RATE", label: "No prazo", unit: "percent", value: 1, previous: 1, delta: 0, deltaPct: 0, trend: "same", snapshot: false },
    OVERDUE: { key: "OVERDUE", label: "Atrasadas", unit: "count", value: 0, previous: null, delta: null, deltaPct: null, trend: "none", snapshot: true },
    WORKED_HOURS: { key: "WORKED_HOURS", label: "Tempo trabalhado", unit: "hours", value: 3, previous: 2, delta: 1, deltaPct: 50, trend: "better", snapshot: false },
    UNASSIGNED_OPEN: { key: "UNASSIGNED_OPEN", label: "x", unit: "count", value: 0, previous: null, delta: null, deltaPct: null, trend: "none", snapshot: true },
    ADJUSTMENTS: { key: "ADJUSTMENTS", label: "x", unit: "count", value: 0, previous: null, delta: null, deltaPct: null, trend: "none", snapshot: true },
  },
  topDeliverers: [], overdueBySector: [], series: [], smallSample: false, slowestType: null,
};

const leader = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: `Líder ${id}`, email: `${id}@x.com`, status: "ACTIVE", userType: "DESIGNER", notificationPrefs: null, ...over,
});

const env = process.env;
beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...env, REPORTS_EMAIL_ENABLED: "true", RESEND_API_KEY: "re_test" };
  db.sector.findMany.mockResolvedValue([]);
  db.user.findMany.mockResolvedValue([]);
  db.reportDelivery.count.mockResolvedValue(0);
  db.reportDelivery.findUnique.mockResolvedValue(null);
  db.reportDelivery.upsert.mockResolvedValue({});
  db.notification.findFirst.mockResolvedValue(null);
  sendEmail.mockResolvedValue({ delivered: true });
  getPerformanceSummary.mockResolvedValue(summary);
  listRunningGoals.mockResolvedValue([]);
  evaluateGoals.mockResolvedValue([]);
  listRunningObjectives.mockResolvedValue([]);
  evaluateObjectives.mockResolvedValue([]);
  getPendingCheckIns.mockResolvedValue([]);
});
afterEach(() => {
  process.env = env;
});

describe("reportEmailsStatus", () => {
  it("só liga com a flag e a chave", () => {
    expect(reportEmailsStatus({ RESEND_API_KEY: "k" } as never).enabled).toBe(false);
    expect(reportEmailsStatus({ REPORTS_EMAIL_ENABLED: "true" } as never).enabled).toBe(false);
    expect(reportEmailsStatus({ REPORTS_EMAIL_ENABLED: "yes", RESEND_API_KEY: "k" } as never).enabled).toBe(false);
    expect(reportEmailsStatus({ REPORTS_EMAIL_ENABLED: "true", RESEND_API_KEY: "k" } as never).enabled).toBe(true);
  });
});

describe("runReportEmails: desligado e fora do dia", () => {
  it("desligado não consulta nem envia", async () => {
    delete process.env.REPORTS_EMAIL_ENABLED;
    const r = await runReportEmails(TUESDAY);
    expect(r).toMatchObject({ enabled: false, sent: 0 });
    expect(r.reason).toContain("REPORTS_EMAIL_ENABLED");
    expect(db.sector.findMany).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it("fim de semana não envia", async () => {
    const r = await runReportEmails(SATURDAY);
    expect(r).toMatchObject({ enabled: true, kinds: [], sent: 0 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("runReportEmails: líderes (diário)", () => {
  it("manda um por setor, com o escopo do setor e a comparação com o dia útil anterior", async () => {
    db.sector.findMany.mockResolvedValue([{ id: "s1", name: "Design", leader: leader("l1") }]);
    const r = await runReportEmails(TUESDAY);
    expect(r).toMatchObject({ sent: 1, failed: 0, kinds: ["LEADER_DAILY"] });
    const call = getPerformanceSummary.mock.calls[0][0];
    expect(call.scope).toEqual({ sectorId: "s1" });
    expect(call.previousRange.from.toISOString()).toBe("2026-10-02T03:00:00.000Z"); // sexta, não domingo
    expect(listRunningGoals).toHaveBeenCalledWith({ sectorId: "s1" }, TUESDAY);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "l1@x.com", subject: "Resumo de 05/10 · Setor Design" }));
    expect(db.reportDelivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_kind_periodKey: { userId: "l1", kind: "LEADER_DAILY", periodKey: "2026-10-06:s1" } }, create: expect.objectContaining({ status: "SENT" }) })
    );
  });
  it("líder de dois setores recebe dois e-mails", async () => {
    db.sector.findMany.mockResolvedValue([
      { id: "s1", name: "Design", leader: leader("l1") },
      { id: "s2", name: "Vídeo", leader: leader("l1") },
    ]);
    expect((await runReportEmails(TUESDAY)).sent).toBe(2);
  });
  it("não manda para inativo, externo, sem líder ou quem desligou", async () => {
    db.sector.findMany.mockResolvedValue([
      { id: "a", name: "A", leader: leader("x1", { status: "INACTIVE" }) },
      { id: "b", name: "B", leader: leader("x2", { userType: "EXTERNAL_CLIENT" }) },
      { id: "c", name: "C", leader: null },
      { id: "d", name: "D", leader: leader("x3", { notificationPrefs: { emailReports: false } }) },
      { id: "e", name: "E", leader: leader("ok") },
    ]);
    const r = await runReportEmails(TUESDAY);
    expect(r.sent).toBe(1);
    expect(sendEmail.mock.calls[0][0].to).toBe("ok@x.com");
  });
});

describe("runReportEmails: gestão (semanal)", () => {
  it("na segunda manda o semanal da agência e o diário dos líderes", async () => {
    db.user.findMany.mockResolvedValue([{ id: "m1", name: "Rafael Admin", email: "m1@x.com", notificationPrefs: null }]);
    db.sector.findMany.mockResolvedValue([{ id: "s1", name: "Design", leader: leader("l1") }]);
    const r = await runReportEmails(MONDAY);
    expect(r.kinds).toEqual(["LEADER_DAILY", "MANAGEMENT_WEEKLY"]);
    expect(r.sent).toBe(2);
    const weekly = sendEmail.mock.calls.find((c) => c[0].to === "m1@x.com")![0];
    expect(weekly.subject).toBe("Resumo semanal da operação · 28/09 a 04/10");
    expect(db.user.findMany.mock.calls[0][0].where.userType).toEqual({ in: ["ADMIN", "MANAGEMENT"] });
  });
  it("só consulta o resumo da agência uma vez para vários gestores", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "m1", name: "A", email: "a@x.com", notificationPrefs: null },
      { id: "m2", name: "B", email: "b@x.com", notificationPrefs: null },
      { id: "m3", name: "C", email: "c@x.com", notificationPrefs: { emailReports: false } },
    ]);
    await runReportEmails(MONDAY);
    const agencyCalls = getPerformanceSummary.mock.calls.filter((c) => !c[0].scope.sectorId);
    expect(agencyCalls).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});

describe("runReportEmails: check-ins pendentes", () => {
  it("o semanal da gestão leva as pendências, calculadas uma vez; o diário não", async () => {
    getPendingCheckIns.mockResolvedValue([
      { objectiveId: "o", objectiveTitle: "Obj", ownerId: "u", ownerName: "Ana", keyResultId: "k", keyResultTitle: "Clientes novos", daysSince: 9 },
    ]);
    db.user.findMany.mockResolvedValue([
      { id: "m1", name: "A", email: "a@x.com", notificationPrefs: null },
      { id: "m2", name: "B", email: "b@x.com", notificationPrefs: null },
    ]);
    db.sector.findMany.mockResolvedValue([{ id: "s1", name: "Design", leader: leader("l1") }]);
    await runReportEmails(MONDAY);
    expect(getPendingCheckIns).toHaveBeenCalledTimes(1);
    const html = (to: string) => sendEmail.mock.calls.find((c) => c[0].to === to)![0].html as string;
    expect(html("a@x.com")).toContain("Check-ins pendentes");
    expect(html("a@x.com")).toContain("Clientes novos");
    expect(html("l1@x.com")).not.toContain("Check-ins pendentes");
  });
});

describe("runReportEmails: idempotência, falhas e limite", () => {
  const oneLeader = () => db.sector.findMany.mockResolvedValue([{ id: "s1", name: "Design", leader: leader("l1") }]);

  it("não reenvia o que já saiu", async () => {
    oneLeader();
    db.reportDelivery.findUnique.mockResolvedValue({ status: "SENT" });
    const r = await runReportEmails(TUESDAY);
    expect(r).toMatchObject({ sent: 0, alreadySent: 1 });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it("tenta de novo o que falhou antes", async () => {
    oneLeader();
    db.reportDelivery.findUnique.mockResolvedValue({ status: "FAILED" });
    expect((await runReportEmails(TUESDAY)).sent).toBe(1);
  });
  it("Resend sem confirmação vira FAILED e o próximo segue", async () => {
    db.sector.findMany.mockResolvedValue([
      { id: "s1", name: "A", leader: leader("l1") },
      { id: "s2", name: "B", leader: leader("l2") },
    ]);
    sendEmail.mockResolvedValueOnce({ delivered: false }).mockResolvedValueOnce({ delivered: true });
    const r = await runReportEmails(TUESDAY);
    expect(r).toMatchObject({ sent: 1, failed: 1 });
    expect(db.reportDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ userId: "l1", status: "FAILED" }) }));
  });
  it("exceção de um destinatário não derruba os outros", async () => {
    db.sector.findMany.mockResolvedValue([
      { id: "s1", name: "A", leader: leader("l1") },
      { id: "s2", name: "B", leader: leader("l2") },
    ]);
    getPerformanceSummary.mockRejectedValueOnce(new Error("banco caiu")).mockResolvedValue(summary);
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await runReportEmails(TUESDAY);
    spy.mockRestore();
    expect(r).toMatchObject({ sent: 1, failed: 1 });
    expect(db.reportDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "FAILED", error: "banco caiu" }) }));
  });
  it("para em 90 envios no dia, registra o resto e avisa a gestão uma vez", async () => {
    oneLeader();
    db.reportDelivery.count.mockResolvedValue(90);
    db.user.findMany.mockResolvedValue([{ id: "m1" }, { id: "m2" }]);
    const r = await runReportEmails(TUESDAY);
    expect(r).toMatchObject({ sent: 0, skipped: 1 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.reportDelivery.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "SKIPPED", error: "limite diário" }) }));
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification.mock.calls[0][0]).toMatchObject({ type: "OTHER", title: "Limite diário de e-mails atingido" });
  });
  it("já avisou hoje: não avisa de novo", async () => {
    oneLeader();
    db.reportDelivery.count.mockResolvedValue(90);
    db.notification.findFirst.mockResolvedValue({ id: "n" });
    await runReportEmails(TUESDAY);
    expect(createNotification).not.toHaveBeenCalled();
  });
});
