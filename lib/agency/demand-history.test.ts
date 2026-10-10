import { describe, expect, it } from "vitest";
import { formatDateIso, parseDescriptionChange, parseReason, toDemandHistoryEntry } from "./demand-history";

const at = new Date("2026-10-10T15:00:00Z");

describe("toDemandHistoryEntry", () => {
  it("lê mudança de prazo com motivo", () => {
    const entry = toDemandHistoryEntry({
      id: "a1",
      action: "DEADLINE_CHANGED",
      createdAt: at,
      user: { name: "Ana" },
      newValue: { field: "dueDate", previous: "2026-10-12T12:00:00.000Z", new: "2026-10-20T12:00:00.000Z", justification: "Cliente pediu" },
    });
    expect(entry).toMatchObject({ kind: "deadline", label: "Prazo", from: "12/10/2026", to: "20/10/2026", reason: "Cliente pediu", userName: "Ana" });
  });

  it("aceita prazo antes sem data e motivo vazio", () => {
    const entry = toDemandHistoryEntry({
      id: "a2",
      action: "DEADLINE_CHANGED",
      createdAt: at,
      user: null,
      newValue: { field: "publishDate", previous: null, new: "2026-11-01T12:00:00.000Z", justification: "" },
    });
    expect(entry).toMatchObject({ label: "Data de publicação", from: null, to: "01/11/2026", reason: null, userName: null });
  });

  it("lê mudança de descrição e ignora outras atualizações", () => {
    expect(
      toDemandHistoryEntry({ id: "a3", action: "DEMAND_UPDATED", createdAt: at, user: { name: "Ana" }, newValue: { field: "description", previous: "velha", new: "nova", reason: "ajuste" } })
    ).toMatchObject({ kind: "description", from: "velha", to: "nova", reason: "ajuste" });
    expect(toDemandHistoryEntry({ id: "a4", action: "DEMAND_UPDATED", createdAt: at, user: null, newValue: { field: "title" } })).toBeNull();
    expect(toDemandHistoryEntry({ id: "a5", action: "STATUS_CHANGED", createdAt: at, user: null, newValue: null })).toBeNull();
  });
});

describe("validações", () => {
  it("formata datas ISO e recusa lixo", () => {
    expect(formatDateIso("2026-10-12T12:00:00.000Z")).toBe("12/10/2026");
    expect(formatDateIso("lixo")).toBeNull();
    expect(formatDateIso(null)).toBeNull();
  });

  it("motivo é opcional e limitado", () => {
    expect(parseReason("  ")).toBeNull();
    expect(parseReason(" ok ")).toBe("ok");
    expect(() => parseReason("x".repeat(501))).toThrow(/500/);
  });

  it("descrição precisa mudar e caber no limite", () => {
    expect(parseDescriptionChange("igual", " igual ")).toMatchObject({ ok: false });
    expect(parseDescriptionChange(null, "nova")).toEqual({ ok: true, value: "nova" });
    expect(parseDescriptionChange("a", "x".repeat(4001))).toMatchObject({ ok: false });
    expect(parseDescriptionChange("a", 5 as unknown as string)).toMatchObject({ ok: false });
    expect(parseDescriptionChange("algo", "")).toEqual({ ok: true, value: "" });
  });
});
