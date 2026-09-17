import { describe, expect, it } from "vitest";
import {
  diffNewIds,
  muralAnnouncementId,
  muralBirthdayId,
  rememberIds,
} from "./live-alerts";

describe("live-alerts", () => {
  it("ids ausentes de seen são novos", () => {
    expect(diffNewIds(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("depois do baseline só o id novo entra", () => {
    const seen = rememberIds([], ["a", "b"]);
    expect(diffNewIds(["a", "b"], seen)).toEqual([]);
    expect(diffNewIds(["a", "b", "c"], seen)).toEqual(["c"]);
  });

  it("ids de mural são estáveis", () => {
    expect(muralAnnouncementId("a1")).toBe("announcement:a1");
    expect(muralBirthdayId({ id: "u1", kindOf: "user" })).toBe(
      "birthday:user:u1"
    );
  });
});
