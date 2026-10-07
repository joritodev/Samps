import { describe, expect, it } from "vitest";
import { luminance, readableInk } from "./contrast";

describe("readableInk", () => {
  it("fundo escuro leva texto branco, fundo claro leva texto escuro", () => {
    expect(readableInk("#1e3a8a")).toBe("#ffffff");
    expect(readableInk("#0ea5e9")).toBe("#0b1220");
    expect(readableInk("#f9fafb")).toBe("#0b1220");
    expect(readableInk("#000")).toBe("#ffffff");
  });
  it("sem cor válida cai no branco", () => {
    expect(readableInk(null)).toBe("#ffffff");
    expect(readableInk("hsl(var(--primary))")).toBe("#ffffff");
  });
  it("luminância dos extremos", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("zzz")).toBeNull();
  });
});
