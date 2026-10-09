import { describe, expect, it } from "vitest";
import {
  DESIGN_TIME_DEFAULTS,
  PLAN_SECTOR_CONFIG,
  designMinutes,
  isPlanSectorSlug,
  planStatusLabel,
} from "./config";

describe("config do quadro", () => {
  it("só video e design são setores do quadro", () => {
    expect(isPlanSectorSlug("video")).toBe(true);
    expect(isPlanSectorSlug("design")).toBe(true);
    expect(isPlanSectorSlug("social")).toBe(false);
    expect(isPlanSectorSlug("")).toBe(false);
  });

  it("o tipo padrão de cada setor existe na lista de tipos", () => {
    for (const config of Object.values(PLAN_SECTOR_CONFIG)) {
      expect(config.kinds.some((k) => k.value === config.defaultKind)).toBe(true);
      expect(config.categories).toContain(config.defaultCategory);
    }
  });

  it("designMinutes usa o preset salvo ou o padrão", () => {
    expect(designMinutes("peca", [])).toBe(15);
    expect(designMinutes("peca", [{ label: "Criativo estático (por criativo)", hours: 0.5 }])).toBe(30);
    expect(designMinutes("inexistente", [])).toBeNull();
  });

  it("os rótulos de design coincidem com os presets do seed", () => {
    expect(DESIGN_TIME_DEFAULTS).toHaveLength(10);
  });

  it("rótulo de status", () => {
    expect(planStatusLabel("CONCLUIDO")).toBe("Concluído");
    expect(planStatusLabel("NAO_ALOCADO")).toBe("Não alocado");
  });
});
