import { describe, expect, it } from "vitest";
import {
  DAILY_EMAIL_LIMIT,
  dueReportKinds,
  esc,
  periodKeyFor,
  renderReportEmail,
  reportPeriod,
  reportSubject,
  type ReportEmailData,
} from "./report-emails";
import { buildPerformanceSummary } from "./performance-summary";
import { dayKey } from "./sp-calendar";

const at = (iso: string) => new Date(iso);

describe("dueReportKinds", () => {
  it("diário de segunda a sexta; semanal só na segunda", () => {
    expect(dueReportKinds(at("2026-10-05T12:00:00Z"))).toEqual(["LEADER_DAILY", "MANAGEMENT_WEEKLY"]); // segunda
    expect(dueReportKinds(at("2026-10-06T12:00:00Z"))).toEqual(["LEADER_DAILY"]);
    expect(dueReportKinds(at("2026-10-09T12:00:00Z"))).toEqual(["LEADER_DAILY"]); // sexta
    expect(dueReportKinds(at("2026-10-10T12:00:00Z"))).toEqual([]); // sábado
    expect(dueReportKinds(at("2026-10-11T12:00:00Z"))).toEqual([]); // domingo
  });
  it("usa o dia de São Paulo", () => {
    expect(dueReportKinds(at("2026-10-12T01:00:00Z"))).toEqual([]); // domingo 22h em SP
  });
});

describe("reportPeriod", () => {
  it("diário: dia útil anterior contra o dia útil antes dele", () => {
    const p = reportPeriod("LEADER_DAILY", at("2026-10-06T12:00:00Z")); // terça
    expect(p.from.toISOString()).toBe("2026-10-05T03:00:00.000Z");
    expect(p.previous.from.toISOString()).toBe("2026-10-02T03:00:00.000Z"); // sexta, não domingo
    expect(p.key).toBe("2026-10-06");
    expect(p.label).toBe("05/10");
  });
  it("diário na segunda mostra a sexta", () => {
    const p = reportPeriod("LEADER_DAILY", at("2026-10-05T12:00:00Z"));
    expect(dayKey(p.from)).toBe("2026-10-02");
    expect(dayKey(p.previous.from)).toBe("2026-10-01");
  });
  it("semanal: semana anterior inteira contra a semana antes dela", () => {
    const p = reportPeriod("MANAGEMENT_WEEKLY", at("2026-10-05T12:00:00Z"));
    expect(p.from.toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(p.to.toISOString()).toBe("2026-10-05T02:59:59.999Z");
    expect(p.previous.from.toISOString()).toBe("2026-09-21T03:00:00.000Z");
    expect(p.previous.to.toISOString()).toBe("2026-09-28T02:59:59.999Z");
    expect(p.label).toBe("28/09 a 04/10");
  });
  it("chave: diário leva o setor; semanal não", () => {
    const d = reportPeriod("LEADER_DAILY", at("2026-10-06T12:00:00Z"));
    expect(periodKeyFor("LEADER_DAILY", d, "s1")).toBe("2026-10-06:s1");
    expect(periodKeyFor("MANAGEMENT_WEEKLY", reportPeriod("MANAGEMENT_WEEKLY", at("2026-10-05T12:00:00Z")), "s1")).toBe("2026-10-05");
  });
  it("limite diário fica abaixo dos 100 do plano gratuito", () => {
    expect(DAILY_EMAIL_LIMIT).toBeLessThan(100);
  });
});

describe("esc", () => {
  it("escapa o que quebraria o HTML", () => {
    expect(esc(`<img src=x onerror="a()"> & 'b'`)).toBe("&lt;img src=x onerror=&quot;a()&quot;&gt; &amp; &#39;b&#39;");
  });
});

function data(over: Partial<ReportEmailData> = {}): ReportEmailData {
  const summary = buildPerformanceSummary({
    range: { from: at("2026-09-28T12:00:00Z"), to: at("2026-10-04T12:00:00Z") },
    rows: [
      {
        id: "1", createdAt: at("2026-09-20T12:00:00Z"), dueDate: null, completedAt: at("2026-09-29T15:00:00Z"),
        assignee: { id: "u1", name: "Ana <b>Silva</b>" }, contentType: null, hadRework: false, activeSeconds: 100,
      },
    ],
    workedSeconds: { current: 7200, previous: 3600 },
    snapshot: { overdue: 2, adjustments: 1, unassignedOpen: 3, overdueBySector: [{ sectorId: "s", name: "Design <x>", count: 2 }] },
  });
  return {
    kind: "MANAGEMENT_WEEKLY", recipientName: "Rafael Admin", scopeLabel: "Agência", periodLabel: "28/09 a 04/10",
    summary, goals: [], objectives: [], link: "https://app.exemplo.com/performance", ...over,
  };
}

describe("renderReportEmail: check-ins pendentes", () => {
  const pending = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      objectiveId: `o${i}`, objectiveTitle: `Obj <${i}>`, ownerId: "u", ownerName: "Ana", keyResultId: `k${i}`,
      keyResultTitle: `KR ${i}`, daysSince: i === 0 ? null : 9,
    }));
  it("seção só no semanal, escapada e limitada a 8", () => {
    const { html } = renderReportEmail(data({ pendingCheckIns: pending(10) }));
    expect(html).toContain("Check-ins pendentes");
    expect(html).toContain("sem check-in ainda");
    expect(html).toContain("há 9 dias");
    expect(html).toContain("Obj &lt;0&gt;");
    expect(html).toContain("e mais 2");
    expect(renderReportEmail(data({ kind: "LEADER_DAILY", pendingCheckIns: pending(2) })).html).not.toContain("Check-ins pendentes");
    expect(renderReportEmail(data({ pendingCheckIns: [] })).html).not.toContain("Check-ins pendentes");
  });
});

describe("renderReportEmail", () => {
  it("assunto por tipo", () => {
    expect(reportSubject(data())).toBe("Resumo semanal da operação · 28/09 a 04/10");
    expect(reportSubject(data({ kind: "LEADER_DAILY", scopeLabel: "Setor Design", periodLabel: "05/10" }))).toBe("Resumo de 05/10 · Setor Design");
  });
  it("traz a frase, os números, a atenção e o botão", () => {
    const { html } = renderReportEmail(data());
    expect(html).toContain("Concluídas");
    expect(html).toContain("Olá, Rafael.");
    expect(html).toContain("2 demandas atrasadas (2 em Design &lt;x&gt;)");
    expect(html).toContain("3 demandas sem responsável");
    expect(html).toContain('href="https://app.exemplo.com/performance"');
    expect(html).toContain("ser gestão");
  });
  it("nada vindo do banco entra sem escape", () => {
    const { html } = renderReportEmail(
      data({
        recipientName: '<script>alert(1)</script>',
        goals: [{ id: "g", metric: "ON_TIME_RATE", scope: "AGENCY", target: 0.85, state: "running", actual: 0.9, status: "met", progress: 1 } as never],
        objectives: [{ id: "o", title: "<img src=x onerror=a()>", progress: 0.5, confidence: "AT_RISK" } as never],
      })
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Silva</b>");
    expect(html).toContain("&lt;img src=x onerror=a()&gt;");
    expect(html).toContain("Ana &lt;b&gt;Silva&lt;/b&gt;");
  });
  it("metas e objetivos aparecem com texto e símbolo, não só cor", () => {
    const { html } = renderReportEmail(
      data({
        goals: [{ id: "g", metric: "ON_TIME_RATE", scope: "SECTOR", sectorName: "Design", target: 0.85, state: "running", actual: 0.9, status: "met" } as never],
        objectives: [{ id: "o", title: "Consistência", progress: 0.5, confidence: "AT_RISK" } as never],
      })
    );
    expect(html).toContain("≥ 85% · Design");
    expect(html).toContain("✓ Meta atingida");
    expect(html).toContain("Consistência");
    expect(html).toContain("50%");
    expect(html).toContain("Em risco");
  });
  it("diário não lista ranking de pessoas", () => {
    const { html } = renderReportEmail(data({ kind: "LEADER_DAILY", periodLabel: "05/10", scopeLabel: "Setor Design" }));
    expect(html).not.toContain("Quem mais entregou");
    expect(html).toContain("liderar um setor");
  });
  it("sem atenção, celebra", () => {
    const summary = buildPerformanceSummary({
      range: { from: at("2026-09-28T12:00:00Z"), to: at("2026-10-04T12:00:00Z") }, rows: [],
      workedSeconds: { current: 0, previous: 0 }, snapshot: { overdue: 0, adjustments: 0, unassignedOpen: 0, overdueBySector: [] },
    });
    expect(renderReportEmail(data({ summary })).html).toContain("Nada pedindo atenção agora.");
  });
});
