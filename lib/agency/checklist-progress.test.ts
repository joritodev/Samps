import { describe, expect, it } from "vitest";
import { computeChecklistProgress } from "./checklist-progress";

describe("computeChecklistProgress", () => {
  it("returns 0/0 for empty checklist", () => {
    expect(computeChecklistProgress([])).toEqual({ done: 0, total: 0 });
  });

  it("counts partial progress", () => {
    expect(
      computeChecklistProgress([
        { status: "DONE" },
        { status: "IN_PRODUCTION" },
      ])
    ).toEqual({ done: 1, total: 2 });
  });

  it("treats DONE, PUBLISHED and DELIVERED as done", () => {
    expect(
      computeChecklistProgress([
        { status: "DONE" },
        { status: "PUBLISHED" },
        { status: "DELIVERED" },
      ])
    ).toEqual({ done: 3, total: 3 });
  });
});
