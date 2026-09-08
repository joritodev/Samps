import { describe, expect, it } from "vitest";
import {
  isVideoDemoContentType,
  videoDemoMissingFields,
} from "./video-demo-briefing";

describe("videoDemoMissingFields", () => {
  it("ignores static content", () => {
    expect(
      videoDemoMissingFields({
        demandType: "FEED",
        contentTypeSlug: "estatico",
      })
    ).toEqual([]);
  });

  it("requires duration and format for REEL", () => {
    expect(
      videoDemoMissingFields({
        demandType: "REEL",
        durationSeconds: null,
        format: null,
      })
    ).toEqual(["duração (segundos)", "formato/orientação (ex.: 9:16 vertical)"]);
  });

  it("accepts complete demo video briefing", () => {
    expect(
      videoDemoMissingFields({
        contentTypeSlug: "reels-demo",
        durationSeconds: 15,
        orientation: "9:16",
      })
    ).toEqual([]);
  });

  it("detects demo slugs", () => {
    expect(isVideoDemoContentType("bastidores-demo")).toBe(true);
    expect(isVideoDemoContentType("estatico")).toBe(false);
  });
});
