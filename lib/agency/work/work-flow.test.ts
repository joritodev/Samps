import { describe, expect, it } from "vitest";
import { addBusinessDays, parseDateKey } from "./dates";
import {
  allowedProjectTransitions,
  parseProjectInput,
  projectProgress,
  projectTransitionError,
  suggestProjectStatus,
} from "./project-flow";
import { editingDueDate, parseShootInput, shootTransitionError } from "./shoot-flow";

describe("datas", () => {
  it("aceita dia válido e recusa inexistente", () => {
    expect(parseDateKey("2026-10-12")).toBeInstanceOf(Date);
    expect(parseDateKey("2026-02-30")).toBe("invalid");
    expect(parseDateKey("12/10/2026")).toBe("invalid");
    expect(parseDateKey("")).toBeNull();
  });

  it("soma dias úteis pulando fim de semana", () => {
    const friday = new Date("2026-10-09T12:00:00Z");
    expect(addBusinessDays(friday, 1).toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(addBusinessDays(friday, 5).toISOString().slice(0, 10)).toBe("2026-10-16");
  });
});

describe("progresso do projeto", () => {
  it("conta entregues sobre o total e ignora canceladas", () => {
    const p = projectProgress(["DONE", "PUBLISHED", "IN_PRODUCTION", "CANCELLED"]);
    expect(p).toEqual({ total: 3, done: 2, open: 1, percent: 67 });
  });

  it("projeto sem demandas fica em 0%", () => {
    expect(projectProgress([])).toEqual({ total: 0, done: 0, open: 0, percent: 0 });
  });
});

describe("status do projeto", () => {
  const none = projectProgress([]);
  const allDone = projectProgress(["DONE", "DELIVERED"]);
  const open = projectProgress(["DONE", "OPEN"]);

  it("só conclui com tudo entregue", () => {
    expect(projectTransitionError("ACTIVE", "COMPLETED", open)).toMatch(/1 demanda aberta/);
    expect(projectTransitionError("ACTIVE", "COMPLETED", allDone)).toBeNull();
  });

  it("recusa saltos e repetição", () => {
    expect(projectTransitionError("PLANNING", "COMPLETED", allDone)).toMatch(/não permitida/);
    expect(projectTransitionError("ACTIVE", "ACTIVE", none)).toMatch(/já está/);
    expect(allowedProjectTransitions("COMPLETED")).toEqual(["ACTIVE"]);
  });

  it("sugere Em andamento sozinho e conclusão com confirmação", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    expect(suggestProjectStatus({ status: "PLANNING", progress: open, startDate: null, now })).toMatchObject({
      next: "ACTIVE",
      auto: true,
    });
    expect(
      suggestProjectStatus({ status: "PLANNING", progress: none, startDate: new Date("2026-10-01T12:00:00Z"), now })
    ).toMatchObject({ next: "ACTIVE", auto: true });
    expect(
      suggestProjectStatus({ status: "PLANNING", progress: none, startDate: new Date("2026-11-01T12:00:00Z"), now })
    ).toBeNull();
    expect(suggestProjectStatus({ status: "ACTIVE", progress: allDone, startDate: null, now })).toMatchObject({
      next: "COMPLETED",
      auto: false,
    });
    expect(suggestProjectStatus({ status: "ACTIVE", progress: open, startDate: null, now })).toBeNull();
  });
});

describe("parseProjectInput", () => {
  const base = { clientId: "c1", title: "Lançamento da clínica" };

  it("normaliza campos e participantes", () => {
    const r = parseProjectInput({
      ...base,
      description: "  evento  ",
      startDate: "2026-10-12",
      dueDate: "2026-11-12",
      outsideContract: true,
      participantIds: ["u1", "u1", "", "u2"],
    });
    expect(r.ok && r.value).toMatchObject({
      description: "evento",
      outsideContract: true,
      participantIds: ["u1", "u2"],
    });
  });

  it("recusa título curto, prazo antes do início e data inválida", () => {
    expect(parseProjectInput({ ...base, title: "ab" })).toMatchObject({ ok: false });
    expect(parseProjectInput({ ...base, startDate: "2026-10-12", dueDate: "2026-10-01" })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/antes do início/),
    });
    expect(parseProjectInput({ ...base, dueDate: "31/12" })).toMatchObject({ ok: false });
    expect(parseProjectInput({ title: "Projeto sem cliente" })).toMatchObject({ ok: false });
  });
});

describe("captação", () => {
  it("segue a ordem de status e exige o link para concluir", () => {
    expect(shootTransitionError("PLANNED", "SCHEDULED", null)).toBeNull();
    expect(shootTransitionError("PLANNED", "COMPLETED", "https://drive.google.com/x")).toMatch(/não permitida/);
    expect(shootTransitionError("IN_PROGRESS", "COMPLETED", "")).toMatch(/link do material/);
    expect(shootTransitionError("IN_PROGRESS", "COMPLETED", "javascript:alert(1)")).toMatch(/link válido/);
    expect(shootTransitionError("IN_PROGRESS", "COMPLETED", "https://drive.google.com/x")).toBeNull();
    expect(shootTransitionError("COMPLETED", "PLANNED", null)).toMatch(/não permitida/);
  });

  it("prazo da edição é 5 dias úteis depois da gravação", () => {
    expect(editingDueDate(new Date("2026-10-09T12:00:00Z")).toISOString().slice(0, 10)).toBe("2026-10-16");
  });

  it("valida data, horários e dados do formulário", () => {
    const base = { clientId: "c1", title: "Gravação institucional", date: "2026-10-20" };
    expect(parseShootInput(base)).toMatchObject({ ok: true });
    expect(parseShootInput({ ...base, date: "" })).toMatchObject({ ok: false, error: expect.stringMatching(/data/i) });
    expect(parseShootInput({ ...base, startTime: "25:00" })).toMatchObject({ ok: false });
    expect(parseShootInput({ ...base, startTime: "10:00", endTime: "09:00" })).toMatchObject({ ok: false });
    expect(parseShootInput({ ...base, endTime: "09:00" })).toMatchObject({ ok: false });
    const full = parseShootInput({
      ...base,
      startTime: "09:00",
      endTime: "12:00",
      participantIds: ["u1", "u1"],
      createEditingDemand: true,
    });
    expect(full.ok && full.value).toMatchObject({ participantIds: ["u1"], createEditingDemand: true });
  });
});
