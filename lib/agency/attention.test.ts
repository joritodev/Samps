import { describe, expect, it } from "vitest";
import { attentionLabel, attentionReason, rankByAttention, relativeDue } from "./attention";

const now = new Date("2026-09-29T15:00:00");
const d = (s: string) => new Date(s);

describe("attentionReason", () => {
  it("atrasada vence qualquer outro motivo", () => {
    expect(attentionReason({ dueDate: d("2026-09-28T10:00:00"), assigneeId: null }, now)).toBe("overdue");
  });
  it("sem responsável antes de prazo próximo", () => {
    expect(attentionReason({ dueDate: d("2026-09-30T10:00:00"), assigneeId: null }, now)).toBe("unassigned");
  });
  it("vence em até 48h", () => {
    expect(attentionReason({ dueDate: d("2026-10-01T10:00:00"), assigneeId: "u" }, now)).toBe("due-soon");
  });
  it("sem urgência cai para prioridade", () => {
    expect(attentionReason({ dueDate: d("2026-10-10T10:00:00"), assigneeId: "u" }, now)).toBe("priority");
  });
});

describe("rankByAttention", () => {
  it("ordena por motivo, depois peso, depois prazo", () => {
    const items = [
      { id: "prio", dueDate: d("2026-10-10"), assigneeId: "u", priorityWeight: 9 },
      { id: "soon", dueDate: d("2026-09-30T20:00:00"), assigneeId: "u", priorityWeight: 1 },
      { id: "free", dueDate: null, assigneeId: null, priorityWeight: 1 },
      { id: "late-low", dueDate: d("2026-09-20"), assigneeId: "u", priorityWeight: 1 },
      { id: "late-high", dueDate: d("2026-09-27"), assigneeId: "u", priorityWeight: 5 },
    ];
    expect(rankByAttention(items, now).map((r) => r.item.id)).toEqual([
      "late-high", "late-low", "free", "soon", "prio",
    ]);
  });
});

describe("relativeDue / attentionLabel", () => {
  it("fala em dias de agenda", () => {
    expect(relativeDue(d("2026-09-29T18:00:00"), now)).toBe("vence hoje");
    expect(relativeDue(d("2026-09-29T09:00:00"), now)).toBe("venceu hoje");
    expect(relativeDue(d("2026-09-30T09:00:00"), now)).toBe("vence amanhã");
    expect(relativeDue(d("2026-09-27T09:00:00"), now)).toBe("atrasada há 2 dias");
    expect(relativeDue(d("2026-10-03T09:00:00"), now)).toBe("vence em 4 dias");
  });
  it("rótulo do card", () => {
    expect(attentionLabel("overdue", d("2026-09-28"), now)).toBe("Atrasada há 1 dia");
    expect(attentionLabel("unassigned", null, now)).toBe("Sem responsável");
    expect(attentionLabel("priority", null, now)).toBe("Alta prioridade");
  });
});
