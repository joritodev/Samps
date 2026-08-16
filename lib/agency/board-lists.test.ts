import { describe, expect, it } from "vitest";
import {
  boardColumnForList,
  isValidBoardListName,
  normalizeBoardListName,
} from "@/types/board";

describe("board list helpers", () => {
  it("boardColumnForList is stable by list id", () => {
    expect(boardColumnForList({ id: "abc123" })).toBe("list:abc123");
  });

  it("normalizes and validates list names", () => {
    expect(normalizeBoardListName("  REELS   CONGRESSO ")).toBe(
      "REELS CONGRESSO"
    );
    expect(isValidBoardListName("")).toBe(false);
    expect(isValidBoardListName("   ")).toBe(false);
    expect(isValidBoardListName("A")).toBe(true);
    expect(isValidBoardListName("x".repeat(60))).toBe(true);
    expect(isValidBoardListName("x".repeat(61))).toBe(false);
  });
});
