import { describe, expect, it } from "vitest";
import { dailyMessage, greeting, isDailySummaryAudience, previousWorkday } from "./daily-summary";

describe("isDailySummaryAudience", () => {
  it("quem executa e não lidera setor", () => {
    for (const t of ["SOCIAL_MEDIA", "DESIGNER", "VIDEOMAKER", "VIDEO_EDITOR", "OTHER"]) {
      expect(isDailySummaryAudience(t, 0)).toBe(true);
      expect(isDailySummaryAudience(t, 1)).toBe(false);
    }
  });
  it("gestão, admin e cliente externo ficam de fora", () => {
    for (const t of ["ADMIN", "MANAGEMENT", "EXTERNAL_CLIENT"]) expect(isDailySummaryAudience(t, 0)).toBe(false);
  });
});

describe("previousWorkday", () => {
  const keyOf = (iso: string) => previousWorkday(new Date(iso)).key;
  it("dia útil mostra o dia anterior", () => {
    expect(keyOf("2026-10-07T15:00:00Z")).toBe("2026-10-06"); // quarta → terça
    expect(keyOf("2026-10-02T15:00:00Z")).toBe("2026-10-01"); // sexta → quinta
  });
  it("segunda, sábado e domingo mostram a sexta", () => {
    expect(keyOf("2026-10-05T15:00:00Z")).toBe("2026-10-02"); // segunda
    expect(keyOf("2026-10-04T15:00:00Z")).toBe("2026-10-02"); // domingo
    expect(keyOf("2026-10-03T15:00:00Z")).toBe("2026-10-02"); // sábado
  });
  it("usa o dia de São Paulo (madrugada em UTC ainda é o dia anterior)", () => {
    expect(keyOf("2026-10-06T01:00:00Z")).toBe("2026-10-02"); // segunda 05/10 22h em SP
    const range = previousWorkday(new Date("2026-10-07T15:00:00Z"));
    expect(range.from.toISOString()).toBe("2026-10-06T03:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-07T02:59:59.999Z");
  });
});

describe("dailyMessage", () => {
  it("compara a pessoa só com ela mesma", () => {
    expect(dailyMessage({ completed: 4, previousCompleted: 2, workedSeconds: 0 })).toEqual({
      title: "Você concluiu 4 entregas ontem. Bom ritmo!",
      detail: "Mais que no dia útil anterior (2).",
    });
    expect(dailyMessage({ completed: 1, previousCompleted: 1, workedSeconds: 0 }).title).toBe("Você concluiu 1 entrega ontem.");
    expect(dailyMessage({ completed: 1, previousCompleted: 3, workedSeconds: 0 }).detail).toContain("foram 3");
  });
  it("sem entrega: reconhece o tempo trabalhado ou segue o dia", () => {
    expect(dailyMessage({ completed: 0, previousCompleted: 2, workedSeconds: 3600 }).title).toContain("trabalhou");
    expect(dailyMessage({ completed: 0, previousCompleted: 0, workedSeconds: 0 }).title).toBe("Um novo dia começa.");
  });
  it("na segunda fala da sexta", () => {
    expect(dailyMessage({ completed: 2, previousCompleted: 1, workedSeconds: 0 }, "na sexta").title).toContain("na sexta");
  });
});

describe("greeting", () => {
  it("saudação pelo horário de SP e primeiro nome", () => {
    expect(greeting("Ana Carolina", new Date("2026-10-02T12:00:00Z"))).toBe("Bom dia, Ana!");
    expect(greeting("Ana Carolina", new Date("2026-10-02T18:00:00Z"))).toBe("Boa tarde, Ana!");
    expect(greeting("Ana", new Date("2026-10-02T23:00:00Z"))).toBe("Boa noite, Ana!");
    expect(greeting("  ", new Date("2026-10-02T12:00:00Z"))).toBe("Bom dia!");
  });
});
