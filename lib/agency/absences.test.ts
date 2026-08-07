import { describe, expect, it } from "vitest";
import {
  absenceKindLabel,
  isAbsentOn,
  mapAbsencesToAgendaEvents,
} from "./absences";

const ferias = {
  startsAt: new Date("2026-08-10T00:00:00Z"),
  endsAt: new Date("2026-08-14T00:00:00Z"),
  canceledAt: null,
};

describe("isAbsentOn", () => {
  it("inclui o primeiro e o ultimo dia", () => {
    expect(isAbsentOn(ferias, new Date("2026-08-10T23:00:00Z"))).toBe(true);
    expect(isAbsentOn(ferias, new Date("2026-08-14T01:00:00Z"))).toBe(true);
  });

  it("exclui dias fora do intervalo", () => {
    expect(isAbsentOn(ferias, new Date("2026-08-09T12:00:00Z"))).toBe(false);
    expect(isAbsentOn(ferias, new Date("2026-08-15T12:00:00Z"))).toBe(false);
  });

  it("ignora ausencia cancelada", () => {
    expect(
      isAbsentOn(
        { ...ferias, canceledAt: new Date() },
        new Date("2026-08-11T12:00:00Z")
      )
    ).toBe(false);
  });
});

describe("absenceKindLabel", () => {
  it("traduz os tipos", () => {
    expect(absenceKindLabel("DAY_OFF")).toBe("Folga");
    expect(absenceKindLabel("VACATION")).toBe("Férias");
    expect(absenceKindLabel("OFFLINE")).toBe("Indisponível");
    expect(absenceKindLabel("SICK_LEAVE")).toBe("Atestado");
  });
});

describe("mapAbsencesToAgendaEvents", () => {
  it("expande um evento por dia do intervalo", () => {
    const events = mapAbsencesToAgendaEvents([
      {
        id: "a1",
        kind: "VACATION",
        startsAt: new Date("2026-08-10T00:00:00Z"),
        endsAt: new Date("2026-08-12T00:00:00Z"),
        canceledAt: null,
        user: { id: "u1", name: "Ana" },
      },
    ]);

    expect(events).toHaveLength(3);
    expect(events.every((e) => e.kind === "absence")).toBe(true);
    expect(events[0]?.title).toBe("Férias — Ana");
    expect(events.map((e) => e.date.slice(0, 10))).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
    expect(events.every((e) => e.date.includes("T12:00:00.000Z"))).toBe(true);
  });

  it("ignora ausencias canceladas", () => {
    expect(
      mapAbsencesToAgendaEvents([
        {
          id: "a1",
          kind: "DAY_OFF",
          startsAt: new Date("2026-08-10T00:00:00Z"),
          endsAt: new Date("2026-08-10T00:00:00Z"),
          canceledAt: new Date(),
          user: { id: "u1", name: "Ana" },
        },
      ])
    ).toHaveLength(0);
  });
});
