import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "./prefers-reduced-motion";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined (SSR)", () => {
    const original = globalThis.window;
    // @ts-expect-error test SSR
    delete globalThis.window;
    expect(prefersReducedMotion()).toBe(false);
    globalThis.window = original;
  });

  it("returns true when matchMedia reduce matches", () => {
    const matchMedia = vi
      .fn()
      .mockReturnValue({ matches: true, media: "(prefers-reduced-motion: reduce)" });
    vi.stubGlobal("matchMedia", matchMedia);
    vi.stubGlobal("window", { matchMedia });
    expect(prefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)"
    );
  });

  it("returns false when matchMedia does not match", () => {
    const matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false, media: "(prefers-reduced-motion: reduce)" });
    vi.stubGlobal("matchMedia", matchMedia);
    vi.stubGlobal("window", { matchMedia });
    expect(prefersReducedMotion()).toBe(false);
  });
});
