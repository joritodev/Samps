import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ notification: { findFirst: vi.fn() } }));
const listAllRunningObjectives = vi.hoisted(() => vi.fn());
const createNotification = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/services/okr.service", () => ({ listAllRunningObjectives }));
vi.mock("@/lib/services/notifications.service", () => ({ createNotification }));

import { getPendingCheckIns, runOkrCheckInReminders } from "./okr-reminders.service";

const now = new Date("2026-11-16T12:00:00Z");
const day = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

function objective(id: string, ownerId: string, keyResults: object[], over: object = {}) {
  return { id, title: `Obj ${id}`, ownerId, owner: { name: `Dono ${ownerId}` }, startsOn: day(30), keyResults, ...over };
}
const kr = (id: string, over: object = {}) => ({ id, title: `KR ${id}`, kind: "MANUAL", checkIns: [], ...over });

beforeEach(() => {
  vi.clearAllMocks();
  listAllRunningObjectives.mockResolvedValue([]);
  db.notification.findFirst.mockResolvedValue(null);
  createNotification.mockResolvedValue({ id: "n" });
});

describe("getPendingCheckIns", () => {
  it("usa o último check-in (o mais recente vem primeiro) e ignora os automáticos", async () => {
    listAllRunningObjectives.mockResolvedValue([
      objective("a", "u1", [
        kr("novo", { checkIns: [{ createdAt: day(2) }, { createdAt: day(20) }] }),
        kr("velho", { checkIns: [{ createdAt: day(9) }] }),
        kr("auto", { kind: "KPI" }),
        kr("nunca"),
      ]),
    ]);
    const out = await getPendingCheckIns(now);
    expect(out.map((p) => p.keyResultId).sort()).toEqual(["nunca", "velho"]);
    expect(out.find((p) => p.keyResultId === "velho")).toMatchObject({ daysSince: 9, ownerName: "Dono u1" });
  });
});

describe("runOkrCheckInReminders", () => {
  it("uma notificação por dono, com a contagem", async () => {
    listAllRunningObjectives.mockResolvedValue([
      objective("a", "u1", [kr("1"), kr("2")]),
      objective("b", "u1", [kr("3")]),
      objective("c", "u2", [kr("4")]),
    ]);
    const r = await runOkrCheckInReminders(now);
    expect(r).toEqual({ owners: 2, notified: 2, duplicates: 0 });
    const first = createNotification.mock.calls.find((c) => c[0].userId === "u1")![0];
    expect(first).toMatchObject({ type: "OTHER", title: "Check-ins pendentes", link: "/performance/okrs" });
    expect(first.message).toContain("3 resultados-chave sem atualização");
    expect(first.message).toContain("em 2 objetivos");
    expect(createNotification.mock.calls.find((c) => c[0].userId === "u2")![0].message).toContain("1 resultado-chave sem atualização");
  });
  it("não repete no mesmo dia", async () => {
    listAllRunningObjectives.mockResolvedValue([objective("a", "u1", [kr("1")])]);
    db.notification.findFirst.mockResolvedValue({ id: "x" });
    expect(await runOkrCheckInReminders(now)).toEqual({ owners: 1, notified: 0, duplicates: 1 });
    expect(createNotification).not.toHaveBeenCalled();
  });
  it("sem pendência não avisa ninguém", async () => {
    listAllRunningObjectives.mockResolvedValue([objective("a", "u1", [kr("1", { checkIns: [{ createdAt: day(1) }] })])]);
    expect(await runOkrCheckInReminders(now)).toEqual({ owners: 0, notified: 0, duplicates: 0 });
  });
});
