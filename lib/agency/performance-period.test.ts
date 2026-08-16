import { describe, expect, it } from "vitest";
import { resolvePerformanceRange } from "./performance-period";

const now = new Date(2026, 7, 16, 14, 30, 45, 123);

describe("resolvePerformanceRange", () => {
  it("defaults to the current month through the end of today", () => {
    expect(resolvePerformanceRange({ now })).toEqual({
      from: new Date(2026, 7, 1, 0, 0, 0, 0),
      to: new Date(2026, 7, 16, 23, 59, 59, 999),
      preset: "month",
    });
  });

  it("resolves today from the start through the end of the day", () => {
    expect(resolvePerformanceRange({ preset: "today", now })).toEqual({
      from: new Date(2026, 7, 16, 0, 0, 0, 0),
      to: new Date(2026, 7, 16, 23, 59, 59, 999),
      preset: "today",
    });
  });

  it("resolves the week as today and the previous six days", () => {
    expect(resolvePerformanceRange({ preset: "week", now })).toEqual({
      from: new Date(2026, 7, 10, 0, 0, 0, 0),
      to: new Date(2026, 7, 16, 23, 59, 59, 999),
      preset: "week",
    });
  });

  it("uses valid ISO dates as a custom inclusive range", () => {
    expect(
      resolvePerformanceRange({
        preset: "today",
        from: "2026-07-30",
        to: "2026-08-02",
        now,
      }),
    ).toEqual({
      from: new Date(2026, 6, 30, 0, 0, 0, 0),
      to: new Date(2026, 7, 2, 23, 59, 59, 999),
      preset: "custom",
    });
  });

  it("falls back to the current month when from is invalid", () => {
    expect(
      resolvePerformanceRange({
        preset: "custom",
        from: "2026-02-30",
        to: "2026-03-02",
        now,
      }),
    ).toEqual({
      from: new Date(2026, 7, 1, 0, 0, 0, 0),
      to: new Date(2026, 7, 16, 23, 59, 59, 999),
      preset: "month",
    });
  });

  it("falls back to the current month when only one custom date is present", () => {
    expect(
      resolvePerformanceRange({
        from: "2026-08-01",
        now,
      }),
    ).toEqual({
      from: new Date(2026, 7, 1, 0, 0, 0, 0),
      to: new Date(2026, 7, 16, 23, 59, 59, 999),
      preset: "month",
    });
  });
});
