import { describe, expect, it } from "vitest";
import {
  mean,
  median,
  onTimeRate,
  SMALL_SAMPLE_N,
  stdDev,
} from "./performance-math";

describe("performance-math", () => {
  it("defines the small sample threshold", () => {
    expect(SMALL_SAMPLE_N).toBe(3);
  });

  it("mean returns null for empty", () => {
    expect(mean([])).toBeNull();
  });

  it("mean averages", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it("median returns null for empty", () => {
    expect(median([])).toBeNull();
  });

  it("median handles odd and even sets", () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("stdDev returns the sample deviation of a known set", () => {
    const result = stdDev([2, 4, 4, 4, 5, 5, 7, 9]);

    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(2.138, 2);
  });

  it("stdDev returns null when n is less than 2", () => {
    expect(stdDev([])).toBeNull();
    expect(stdDev([1])).toBeNull();
  });

  it("onTimeRate calculates the rate", () => {
    expect(onTimeRate(3, 4)).toBe(0.75);
  });

  it("onTimeRate returns null for a zero denominator", () => {
    expect(onTimeRate(0, 0)).toBeNull();
  });
});
