import { workdayBefore, previousWorkday } from "@/lib/agency/daily-summary";
import { describeTarget, GOAL_STATUS_LABEL } from "@/lib/agency/goals";
import { CONFIDENCE_LABEL, type StaleCheckIn } from "@/lib/agency/okr";
import { formatProgress } from "@/lib/agency/okr-format";
import { formatComparison, formatKpiValue, shortDay } from "@/lib/agency/performance-format";
import { KPI_CATALOG, type KpiKey, type PerformanceSummary } from "@/lib/agency/performance-summary";
import { addDays, dayKey, endOfDayMs, startOfDayMs } from "@/lib/agency/sp-calendar";
import type { GoalView } from "@/lib/services/goals.service";
import type { ObjectiveView } from "@/lib/services/okr.service";

export type ReportKind = "LEADER_DAILY" | "MANAGEMENT_WEEKLY";

/** Plano gratuito do Resend: 100 e-mails por dia. Paramos antes, com folga. */
export const DAILY_EMAIL_LIMIT = 90;

function weekday(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

/** Quais resumos saem hoje: o do líder de segunda a sexta; o da gestão na segunda. */
export function dueReportKinds(now: Date): ReportKind[] {
  const day = weekday(dayKey(now));
  const kinds: ReportKind[] = [];
  if (day >= 1 && day <= 5) kinds.push("LEADER_DAILY");
  if (day === 1) kinds.push("MANAGEMENT_WEEKLY");
  return kinds;
}

export type ReportPeriod = {
  /** Chave do envio (dia de hoje; o serviço acrescenta o setor no diário). */
  key: string;
  from: Date;
  to: Date;
  /** Período contra o qual comparar. */
  previous: { from: Date; to: Date };
  label: string;
};

/**
 * Diário: o dia útil anterior, comparado ao dia útil antes dele. Semanal
 * (segunda): a semana anterior, de segunda a domingo, contra a semana antes.
 */
export function reportPeriod(kind: ReportKind, now: Date): ReportPeriod {
  const today = dayKey(now);
  if (kind === "LEADER_DAILY") {
    const day = previousWorkday(now);
    const before = workdayBefore(day.key);
    return {
      key: today,
      from: day.from,
      to: day.to,
      previous: { from: before.from, to: before.to },
      label: shortDay(day.key),
    };
  }
  const start = addDays(today, -7);
  const end = addDays(today, -1);
  return {
    key: today,
    from: new Date(startOfDayMs(start)),
    to: new Date(endOfDayMs(end)),
    previous: {
      from: new Date(startOfDayMs(addDays(start, -7))),
      to: new Date(endOfDayMs(addDays(end, -7))),
    },
    label: `${shortDay(start)} a ${shortDay(end)}`,
  };
}

export function periodKeyFor(kind: ReportKind, period: ReportPeriod, sectorId?: string): string {
  return kind === "LEADER_DAILY" && sectorId ? `${period.key}:${sectorId}` : period.key;
}

// -------------------------------------------------------------------- HTML
const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Todo texto vindo do banco passa por aqui antes de entrar no HTML. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]!);
}

export type ReportEmailData = {
  kind: ReportKind;
  recipientName: string;
  /** "Agência" ou "Setor Design". */
  scopeLabel: string;
  periodLabel: string;
  summary: PerformanceSummary;
  goals: GoalView[];
  objectives: ObjectiveView[];
  /** Check-ins pendentes (só no semanal da gestão). */
  pendingCheckIns?: StaleCheckIn[];
  /** URL absoluta da página Performance. */
  link: string;
};

const TILES: KpiKey[] = ["COMPLETED", "ON_TIME_RATE", "OVERDUE", "WORKED_HOURS"];
const INK = "#111827";
const MUTED = "#6b7280";
const PRIMARY = "#0b7a8f";
const GOOD = "#157a3c";
const BAD = "#a8441f";
const WARN = "#a86a05";

const TREND_COLOR = { better: GOOD, worse: BAD, same: MUTED, none: MUTED } as const;
const GOAL_COLOR = { met: GOOD, near: WARN, off: BAD, none: MUTED } as const;
const GOAL_MARK = { met: "✓", near: "!", off: "✕", none: "–" } as const;

function tile(summary: PerformanceSummary, key: KpiKey) {
  const k = summary.indicators[key];
  const cmp = formatComparison(k);
  return `<td style="width:25%;padding:0 4px;vertical-align:top">
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px">
      <div style="font-size:11px;color:${MUTED}">${esc(KPI_CATALOG[key].label)}</div>
      <div style="font-size:22px;font-weight:700;color:${key === "OVERDUE" && (k.value ?? 0) > 0 ? BAD : INK};margin-top:2px">${esc(formatKpiValue(k.value, k.unit))}</div>
      <div style="font-size:11px;color:${TREND_COLOR[cmp.trend]};margin-top:4px">${esc(cmp.text)}</div>
    </div></td>`;
}

function section(title: string, body: string) {
  return `<h2 style="font-size:14px;margin:22px 0 8px;color:${INK}">${esc(title)}</h2>${body}`;
}

function attentionLines(summary: PerformanceSummary): string[] {
  const { OVERDUE, UNASSIGNED_OPEN, ADJUSTMENTS } = summary.indicators;
  const lines: string[] = [];
  const overdue = OVERDUE.value ?? 0;
  if (overdue > 0) {
    const sectors = summary.overdueBySector.slice(0, 3).map((s) => `${s.count} em ${s.name}`).join(" · ");
    lines.push(`${overdue} ${overdue === 1 ? "demanda atrasada" : "demandas atrasadas"}${sectors ? ` (${sectors})` : ""}`);
  }
  const unassigned = UNASSIGNED_OPEN.value ?? 0;
  if (unassigned > 0) lines.push(`${unassigned} ${unassigned === 1 ? "demanda sem responsável" : "demandas sem responsável"}`);
  const adjustments = ADJUSTMENTS.value ?? 0;
  if (adjustments > 0) lines.push(`${adjustments} ${adjustments === 1 ? "demanda em ajuste" : "demandas em ajuste"}`);
  return lines;
}

export function reportSubject(data: Pick<ReportEmailData, "kind" | "scopeLabel" | "periodLabel">): string {
  return data.kind === "MANAGEMENT_WEEKLY"
    ? `Resumo semanal da operação · ${data.periodLabel}`
    : `Resumo de ${data.periodLabel} · ${data.scopeLabel}`;
}

export function renderReportEmail(data: ReportEmailData): { subject: string; html: string } {
  const { summary } = data;
  const weekly = data.kind === "MANAGEMENT_WEEKLY";
  const attention = attentionLines(summary);

  const parts: string[] = [];
  parts.push(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px -4px 0"><tr>${TILES.map((k) => tile(summary, k)).join("")}</tr></table>`);

  parts.push(
    section(
      "Pede atenção",
      attention.length === 0
        ? `<p style="margin:0;font-size:14px;color:${GOOD}">Nada pedindo atenção agora.</p>`
        : `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:${INK}">${attention.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
    )
  );

  if (weekly && summary.topDeliverers.length > 0) {
    parts.push(
      section(
        "Quem mais entregou",
        `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:${INK}">${summary.topDeliverers
          .map((d) => `<li>${esc(d.name)} · ${d.deliveries}${d.onTimeRate === null ? "" : ` (${Math.round(d.onTimeRate * 100)}% no prazo)`}</li>`)
          .join("")}</ul>`
      )
    );
  }

  if (data.goals.length > 0) {
    parts.push(
      section(
        "Metas",
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${data.goals
          .map((g) => {
            const meta = KPI_CATALOG[g.metric];
            return `<tr><td style="padding:3px 0;color:${INK}">${esc(meta.label)} <span style="color:${MUTED}">${esc(describeTarget(g.metric, g.target))} · ${esc(g.scope === "SECTOR" ? (g.sectorName ?? "Setor") : "Agência")}</span></td><td style="padding:3px 0;text-align:right;color:${INK}">${esc(g.state === "upcoming" ? "–" : formatKpiValue(g.actual, meta.unit))}</td><td style="padding:3px 0 3px 12px;text-align:right;color:${GOAL_COLOR[g.status]};white-space:nowrap">${GOAL_MARK[g.status]} ${esc(GOAL_STATUS_LABEL[g.status])}</td></tr>`;
          })
          .join("")}</table>`
      )
    );
  }

  if (data.objectives.length > 0) {
    parts.push(
      section(
        "Objetivos",
        `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${data.objectives
          .map(
            (o) =>
              `<tr><td style="padding:3px 0;color:${INK}">${esc(o.title)}</td><td style="padding:3px 0;text-align:right;color:${INK}">${esc(formatProgress(o.progress))}</td><td style="padding:3px 0 3px 12px;text-align:right;color:${MUTED};white-space:nowrap">${o.confidence ? esc(CONFIDENCE_LABEL[o.confidence]) : "Sem leitura"}</td></tr>`
          )
          .join("")}</table>`
      )
    );
  }

  const pending = data.pendingCheckIns ?? [];
  if (weekly && pending.length > 0) {
    parts.push(
      section(
        "Check-ins pendentes",
        `<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;color:${INK}">${pending
          .slice(0, 8)
          .map(
            (p) =>
              `<li>${esc(p.ownerName)}: ${esc(p.keyResultTitle)} <span style="color:${MUTED}">(${esc(p.objectiveTitle)}, ${p.daysSince === null ? "sem check-in ainda" : `há ${p.daysSince} dias`})</span></li>`
          )
          .join("")}${pending.length > 8 ? `<li style="color:${MUTED}">e mais ${pending.length - 8}</li>` : ""}</ul>`
      )
    );
  }

  const subject = reportSubject(data);
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f6f7f9;padding:24px">
    <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:${PRIMARY};color:#fff;padding:20px 28px">
        <div style="font-size:12px;opacity:.85">Samps Digital · ${esc(weekly ? "Resumo semanal da operação" : `Resumo de ${data.periodLabel}`)} · ${esc(data.scopeLabel)}</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px;line-height:1.35">${esc(summary.headline)}</div>
        <div style="font-size:13px;opacity:.85;margin-top:2px">${esc(data.periodLabel)}</div>
      </div>
      <div style="padding:20px 28px 28px">
        <p style="margin:0;font-size:14px;color:${INK}">Olá, ${esc(data.recipientName.trim().split(/\s+/)[0] ?? "")}. Aqui está o resumo.</p>
        ${parts.join("")}
        <p style="margin:24px 0 0"><a href="${esc(data.link)}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">Abrir Performance</a></p>
        <p style="font-size:12px;color:${MUTED};margin:22px 0 0;line-height:1.6">Você recebe este resumo por ${weekly ? "ser gestão" : "liderar um setor"}. Para parar de receber, desligue “Resumos por e-mail” em Configurações, Notificações.</p>
      </div>
    </div>
  </div>`;
  return { subject, html };
}
