import { describe, expect, it } from "vitest";
import {
  darkSemantic,
  lightSemantic,
  sampsBrand,
  sampsBrandDark,
} from "./tokens";

const HSL_RE = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

describe("sampsBrand", () => {
  it("exposes the six named brand channels", () => {
    expect(Object.keys(sampsBrand).sort()).toEqual(
      ["cyan", "ember", "ink", "line", "paper", "surface"].sort()
    );
  });

  it("uses shadcn HSL channel format", () => {
    for (const value of Object.values(sampsBrand)) {
      expect(value).toMatch(HSL_RE);
    }
    for (const value of Object.values(sampsBrandDark)) {
      expect(value).toMatch(HSL_RE);
    }
  });
});

describe("semantic maps", () => {
  it("maps primary to cyan and brand to ember in light", () => {
    expect(lightSemantic.primary).toBe(sampsBrand.cyan);
    expect(lightSemantic.brand).toBe(sampsBrand.ember);
    expect(lightSemantic.background).toBe(sampsBrand.paper);
    expect(lightSemantic.foreground).toBe(sampsBrand.ink);
  });

  it("keeps destructive distinct from ember", () => {
    expect(lightSemantic.destructive).not.toBe(sampsBrand.ember);
    expect(darkSemantic.destructive).not.toBe(sampsBrandDark.ember);
  });
});
