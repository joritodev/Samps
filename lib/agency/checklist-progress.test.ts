import { describe, expect, it } from "vitest";
import { computeChecklistProgress } from "./checklist-progress";

describe("computeChecklistProgress", () => {
  it("conta isDone", () => {
    expect(
      computeChecklistProgress([{ isDone: true }, { isDone: false }, { isDone: true }])
    ).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it("lista vazia = 0%", () => {
    expect(computeChecklistProgress([])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });
});
