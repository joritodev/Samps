import { describe, expect, it } from "vitest";
import { describeCardChanges } from "./history";

const kinds = [{ value: "video", label: "Vídeo" }];
const members = [{ id: "m1", name: "Pedro" }];
const base = {
  title: "Vídeo 1",
  clientName: "COCO",
  kind: "video",
  category: "Orgânico",
  durationHours: 2,
  status: "PROGRAMADO" as const,
  memberId: "m1",
  weekday: 2,
  dueDate: null,
  required: false,
  recurring: false,
  notes: null,
};

describe("describeCardChanges", () => {
  it("sem mudanças devolve vazio", () => {
    expect(describeCardChanges(base, { ...base }, members, kinds)).toEqual([]);
  });
  it("descreve campo a campo em português", () => {
    const changes = describeCardChanges(
      base,
      { ...base, durationHours: 3, weekday: 4, status: "CONCLUIDO", memberId: null },
      members,
      kinds,
    );
    expect(changes).toContain("horas: 2h → 3h");
    expect(changes).toContain("dia: Terça → Quinta");
    expect(changes).toContain("status: Programado → Concluído");
    expect(changes).toContain("responsável: Pedro → não alocado");
  });
  it("ignora diferença numérica irrelevante", () => {
    expect(
      describeCardChanges(base, { ...base, durationHours: 2.00001 }, members, kinds),
    ).toEqual([]);
  });
});
