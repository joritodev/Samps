import { describe, expect, it } from "vitest";
import {
  demandTypeFromContentSlug,
  normalizeScopeLines,
  periodicitySuffix,
} from "./contract-services";

describe("normalizeScopeLines", () => {
  it("descarta linhas com quantidade menor que 1", () => {
    const out = normalizeScopeLines([
      { contentTypeId: "a", quantity: 0, periodicity: "monthly" },
      { contentTypeId: "b", quantity: 8, periodicity: "monthly" },
    ]);
    expect(out).toEqual([
      { contentTypeId: "b", quantity: 8, periodicity: "monthly" },
    ]);
  });

  it("descarta linha sem tipo de conteudo", () => {
    expect(
      normalizeScopeLines([
        { contentTypeId: "", quantity: 5, periodicity: "monthly" },
      ])
    ).toEqual([]);
  });

  it("cai para monthly quando a periodicidade e invalida", () => {
    const [line] = normalizeScopeLines([
      { contentTypeId: "a", quantity: 2, periodicity: "qualquer" },
    ]);
    expect(line.periodicity).toBe("monthly");
  });
});

describe("mapeamento de tipo de demanda", () => {
  it("mapeia slugs conhecidos", () => {
    expect(demandTypeFromContentSlug("stories")).toBe("STORY");
    expect(demandTypeFromContentSlug("reels")).toBe("REEL");
    expect(demandTypeFromContentSlug("carrossel")).toBe("FEED");
    expect(demandTypeFromContentSlug("motion")).toBe("VIDEO");
    expect(demandTypeFromContentSlug("inexistente")).toBe("OTHER");
  });
});

describe("periodicitySuffix", () => {
  it("formata os sufixos exibidos na ficha", () => {
    expect(periodicitySuffix("monthly")).toBe(" / mês");
    expect(periodicitySuffix("weekly")).toBe(" / semana");
    expect(periodicitySuffix("one_shot")).toBe(" (pacote)");
  });
});
