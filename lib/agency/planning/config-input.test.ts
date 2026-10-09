import { describe, expect, it } from "vitest";
import {
  blockReason,
  parseCapacityHours,
  parseCapacityOverride,
  parseMemberSettings,
  parsePresetInput,
  parseTemplateInput,
  parseTemplateList,
  type TemplateInput,
} from "./config-input";

describe("capacidade", () => {
  it("aceita de 0 a 24 e arredonda em 2 casas", () => {
    expect(parseCapacityHours(0)).toEqual({ ok: true, value: 0 });
    expect(parseCapacityHours(7.456)).toEqual({ ok: true, value: 7.46 });
    expect(parseCapacityHours(-1).ok).toBe(false);
    expect(parseCapacityHours(25).ok).toBe(false);
    expect(parseCapacityHours(Number.NaN).ok).toBe(false);
  });

  it("configuração da pessoa exige cor hexadecimal", () => {
    expect(parseMemberSettings({ id: "m", color: "#1D4ED8", defaultCapacityHours: 6 })).toEqual({
      ok: true,
      value: { id: "m", color: "#1d4ed8", defaultCapacityHours: 6 },
    });
    expect(parseMemberSettings({ id: "m", color: "red", defaultCapacityHours: 6 }).ok).toBe(false);
    expect(parseMemberSettings({ id: "m", color: "#fff", defaultCapacityHours: 6 }).ok).toBe(false);
    expect(parseMemberSettings({ id: "", color: "#1d4ed8", defaultCapacityHours: 6 }).ok).toBe(false);
  });

  it("ajuste por dia e por semana", () => {
    expect(parseCapacityOverride({ memberId: "m", weekday: 3, hours: 4, week: null }).ok).toBe(true);
    expect(
      parseCapacityOverride({ memberId: "m", weekday: 3, hours: 4, week: { year: 2026, week: 37 } }).ok,
    ).toBe(true);
    expect(parseCapacityOverride({ memberId: "m", weekday: 0, hours: 4, week: null }).ok).toBe(false);
    expect(parseCapacityOverride({ memberId: "m", weekday: 7, hours: 4, week: null }).ok).toBe(false);
    expect(parseCapacityOverride({ memberId: "m", weekday: 3, hours: 30, week: null }).ok).toBe(false);
    expect(
      parseCapacityOverride({ memberId: "m", weekday: 3, hours: 4, week: { year: 2026, week: 60 } }).ok,
    ).toBe(false);
  });
});

describe("tipos de produção", () => {
  it("nome e horas válidos", () => {
    expect(parsePresetInput({ label: "  Reel simples — 1h ", hours: 1 })).toEqual({
      ok: true,
      value: { label: "Reel simples — 1h", hours: 1 },
    });
    expect(parsePresetInput({ label: "", hours: 1 }).ok).toBe(false);
    expect(parsePresetInput({ label: "x".repeat(81), hours: 1 }).ok).toBe(false);
    expect(parsePresetInput({ label: "a", hours: 0 }).ok).toBe(false);
    expect(parsePresetInput({ label: "a", hours: 25 }).ok).toBe(false);
  });
});

const tpl = (over: Partial<TemplateInput> = {}): TemplateInput => ({
  title: "Vídeo",
  kind: "video",
  category: "Orgânico",
  durationHours: 2,
  weeklyQuantity: 3,
  ...over,
});

describe("demandas fixas", () => {
  it("valida tipo e categoria pelo setor", () => {
    expect(parseTemplateInput(tpl(), "video").ok).toBe(true);
    expect(parseTemplateInput(tpl({ kind: "peca" }), "video").ok).toBe(false);
    expect(parseTemplateInput(tpl({ kind: "peca" }), "design").ok).toBe(true);
    expect(parseTemplateInput(tpl({ category: "Lançamento" }), "video").ok).toBe(false);
  });

  it("quantidade de 1 a 14, dia de 1 a 6", () => {
    expect(parseTemplateInput(tpl({ weeklyQuantity: 0 }), "video").ok).toBe(false);
    expect(parseTemplateInput(tpl({ weeklyQuantity: 15 }), "video").ok).toBe(false);
    expect(parseTemplateInput(tpl({ weeklyQuantity: 1.5 }), "video").ok).toBe(false);
    expect(parseTemplateInput(tpl({ preferredWeekday: 7 }), "video").ok).toBe(false);
    expect(parseTemplateInput(tpl({ preferredWeekday: 6 }), "video").ok).toBe(true);
  });

  it("lista: limite por cliente e ids repetidos", () => {
    expect(parseTemplateList(Array.from({ length: 31 }, () => tpl()), "video").ok).toBe(false);
    expect(parseTemplateList([tpl({ id: "a" }), tpl({ id: "a" })], "video").ok).toBe(false);
    const ok = parseTemplateList([tpl({ id: "a" }), tpl()], "video");
    expect(ok.ok && ok.value.map((v) => v.id)).toEqual(["a", null]);
  });

  it("texto padrão do bloqueio", () => {
    expect(blockReason(null)).toBe("Feriado / dia bloqueado");
    expect(blockReason("m1")).toBe("Indisponível");
  });
});
