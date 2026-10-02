import { describe, expect, it } from "vitest";
import {
  coverCss,
  parseAppearance,
  sanitizeAppearance,
} from "@/lib/board/appearance";

describe("parseAppearance", () => {
  it("devolve padrão sem config", () => {
    expect(parseAppearance(null)).toEqual({ accent: null, cover: null, coverImage: null });
    expect(parseAppearance({ lists: [] })).toEqual({ accent: null, cover: null, coverImage: null });
  });
  it("aceita chaves válidas e descarta o resto", () => {
    expect(
      parseAppearance({ appearance: { accent: "coral", cover: "noite" } })
    ).toEqual({ accent: "coral", cover: "noite", coverImage: null });
    expect(
      parseAppearance({ appearance: { accent: "url(x)", cover: 3 } })
    ).toEqual({ accent: null, cover: null, coverImage: null });
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

describe("coverImage", () => {
  const ok = "https://abc123.public.blob.vercel-storage.com/board-covers/b1/x.webp";
  it("aceita só URL do nosso storage", () => {
    expect(parseAppearance({ appearance: { coverImage: { url: ok, w: 2400, h: 200 } } }).coverImage)
      .toEqual({ url: ok, w: 2400, h: 200 });
    for (const url of [
      "https://evil.com/board-covers/x.webp",
      "http://abc.public.blob.vercel-storage.com/board-covers/x.webp",
      "https://abc.public.blob.vercel-storage.com/other/x.webp",
      "https://abc.public.blob.vercel-storage.com.evil.com/board-covers/x.webp",
      "javascript:alert(1)",
    ]) {
      expect(parseAppearance({ appearance: { coverImage: { url, w: 1, h: 1 } } }).coverImage).toBeNull();
    }
  });
  it("recusa dimensões absurdas", () => {
    expect(parseAppearance({ appearance: { coverImage: { url: ok, w: 99999, h: 1 } } }).coverImage).toBeNull();
  });
});
