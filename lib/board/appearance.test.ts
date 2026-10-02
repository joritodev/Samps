import { describe, expect, it } from "vitest";
import {
  coverCss,
  parseAppearance,
  sanitizeAppearance,
} from "@/lib/board/appearance";

describe("parseAppearance", () => {
  it("devolve padrão sem config", () => {
    expect(parseAppearance(null)).toEqual({ accent: null, cover: null });
    expect(parseAppearance({ lists: [] })).toEqual({ accent: null, cover: null });
  });
  it("aceita chaves válidas e descarta o resto", () => {
    expect(
      parseAppearance({ appearance: { accent: "coral", cover: "noite" } })
    ).toEqual({ accent: "coral", cover: "noite" });
    expect(
      parseAppearance({ appearance: { accent: "url(x)", cover: 3 } })
    ).toEqual({ accent: null, cover: null });
  });
});

describe("sanitizeAppearance", () => {
  it("aceita nulos (remover) e chaves do conjunto", () => {
    expect(sanitizeAppearance({})).toEqual({ accent: null, cover: null });
    expect(sanitizeAppearance({ accent: "azul", cover: "mare" })).toEqual({
      accent: "azul",
      cover: "mare",
    });
  });
  it("recusa valores fora do conjunto (cor livre, URL)", () => {
    expect(sanitizeAppearance({ accent: "#ff0000" })).toBeUndefined();
    expect(sanitizeAppearance({ cover: "https://x.com/a.png" })).toBeUndefined();
  });
});

describe("coverCss", () => {
  it("resolve a capa e ignora nulo", () => {
    expect(coverCss("aurora")).toContain("gradient");
    expect(coverCss(null)).toBeUndefined();
  });
});
