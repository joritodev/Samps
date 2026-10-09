import { describe, expect, it } from "vitest";
import {
  dayKeyOfWeek,
  formatHours,
  isoWeekOf,
  isoWeekOfKey,
  mondayOfIsoWeek,
  shiftWeek,
  weekRangeLabel,
  weeksInIsoYear,
} from "./week";

describe("semana ISO", () => {
  it("07/09/2026 é a segunda da semana 37", () => {
    expect(isoWeekOfKey("2026-09-07")).toEqual({ year: 2026, week: 37 });
    expect(mondayOfIsoWeek({ year: 2026, week: 37 }).toISOString().slice(0, 10)).toBe(
      "2026-09-07",
    );
  });

  it("o domingo ainda é da semana anterior", () => {
    expect(isoWeekOfKey("2026-09-13")).toEqual({ year: 2026, week: 37 });
    expect(isoWeekOfKey("2026-09-14")).toEqual({ year: 2026, week: 38 });
  });

  it("virada de ano: 31/12/2026 é semana 53 e 01/01/2027 também", () => {
    expect(weeksInIsoYear(2026)).toBe(53);
    expect(isoWeekOfKey("2026-12-31")).toEqual({ year: 2026, week: 53 });
    expect(isoWeekOfKey("2027-01-01")).toEqual({ year: 2026, week: 53 });
    expect(isoWeekOfKey("2027-01-04")).toEqual({ year: 2027, week: 1 });
  });

  it("shiftWeek atravessa o ano nos dois sentidos", () => {
    expect(shiftWeek({ year: 2026, week: 53 }, 1)).toEqual({ year: 2027, week: 1 });
    expect(shiftWeek({ year: 2027, week: 1 }, -1)).toEqual({ year: 2026, week: 53 });
    expect(shiftWeek({ year: 2026, week: 37 }, 2)).toEqual({ year: 2026, week: 39 });
  });

  it("isoWeekOf usa o dia de calendário da data local", () => {
    expect(isoWeekOf(new Date(2026, 8, 7))).toEqual({ year: 2026, week: 37 });
  });

  it("dayKeyOfWeek devolve o dia certo (1 = segunda, 6 = sábado)", () => {
    const week = { year: 2026, week: 37 };
    expect(dayKeyOfWeek(week, 1)).toBe("2026-09-07");
    expect(dayKeyOfWeek(week, 6)).toBe("2026-09-12");
  });

  it("rótulo da semana igual ao painel original", () => {
    expect(weekRangeLabel({ year: 2026, week: 37 })).toBe(
      "Semana 37 — 07/09/2026 a 12/09/2026",
    );
  });
});

describe("formatHours", () => {
  it("formata minutos, horas e misto", () => {
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(2)).toBe("2h");
    expect(formatHours(1.25)).toBe("1h15");
    expect(formatHours(-1)).toBe("-1h");
  });
});

describe("segunda-feira da semana 1", () => {
  it("2027 começa em 04/01 (1º de janeiro caiu numa sexta)", () => {
    expect(mondayOfIsoWeek({ year: 2027, week: 1 }).toISOString().slice(0, 10)).toBe("2027-01-04");
  });
  it("2026 começa em 29/12/2025 (1º de janeiro numa quinta)", () => {
    expect(mondayOfIsoWeek({ year: 2026, week: 1 }).toISOString().slice(0, 10)).toBe("2025-12-29");
  });
  it("ida e volta: toda segunda de 2025 a 2028 volta para a própria semana", () => {
    for (let year = 2025; year <= 2028; year++) {
      for (let week = 1; week <= weeksInIsoYear(year); week++) {
        const monday = mondayOfIsoWeek({ year, week });
        const back = isoWeekOf(
          new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()),
        );
        expect(back).toEqual({ year, week });
      }
    }
  });
});
