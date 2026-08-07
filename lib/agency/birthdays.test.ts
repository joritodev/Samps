import { describe, expect, it } from "vitest";
import { birthdayOccurrenceInYear, isBirthdayToday } from "./birthdays";

describe("isBirthdayToday", () => {
  it("compara dia e mes ignorando o ano", () => {
    expect(isBirthdayToday("1990-08-19", new Date("2026-08-19T12:00:00Z"))).toBe(
      true
    );
    expect(isBirthdayToday("1990-08-19", new Date("2026-08-20T12:00:00Z"))).toBe(
      false
    );
  });

  it("trata ausencia de data", () => {
    expect(isBirthdayToday(null)).toBe(false);
    expect(isBirthdayToday(undefined)).toBe(false);
  });
});

describe("birthdayOccurrenceInYear", () => {
  it("projeta a data no ano pedido", () => {
    const d = birthdayOccurrenceInYear("1990-08-19", 2026);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(7);
    expect(d.getUTCDate()).toBe(19);
  });

  it("cai em 28/02 para nascidos em 29/02 em ano nao bissexto", () => {
    const d = birthdayOccurrenceInYear("2000-02-29", 2026);
    expect(d.getUTCMonth()).toBe(1);
    expect(d.getUTCDate()).toBe(28);
  });
});
