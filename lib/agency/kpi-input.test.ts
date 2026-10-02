import { describe, expect, it } from "vitest";
import { kpiFromField, kpiToField } from "./kpi-input";

describe("kpi-input", () => {
  it("percentual vai de razão para 0–100 e volta", () => {
    expect(kpiToField("ON_TIME_RATE", 0.85)).toBe("85");
    expect(kpiFromField("ON_TIME_RATE", "85")).toBeCloseTo(0.85);
    expect(kpiToField("ON_TIME_RATE", 0.333)).toBe("33.3");
  });
  it("demais unidades ficam como estão e aceitam vírgula", () => {
    expect(kpiToField("OVERDUE", 5)).toBe("5");
    expect(kpiFromField("AVG_LEAD_TIME_DAYS", "3,5")).toBe(3.5);
    expect(Number.isNaN(kpiFromField("OVERDUE", "abc"))).toBe(true);
  });
});
