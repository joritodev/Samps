import { UserStatus, UserType, type DeliveryStatus } from "@prisma/client";
import {
  DAILY_EMAIL_LIMIT,
  dueReportKinds,
  periodKeyFor,
  renderReportEmail,
  reportPeriod,
  type ReportKind,
} from "@/lib/agency/report-emails";
import { dayKey, startOfDayMs } from "@/lib/agency/sp-calendar";
import { db } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/mail/send";
import { evaluateGoals, listRunningGoals } from "@/lib/services/goals.service";
import { createNotification, parseNotificationPrefs } from "@/lib/services/notifications.service";
import { evaluateObjectives, listRunningObjectives } from "@/lib/services/okr.service";
import { getPerformanceSummary } from "@/lib/services/performance-summary.service";

export type ReportRunResult = {
  enabled: boolean;
  reason?: string;
  kinds: ReportKind[];
  sent: number;
  failed: number;
  skipped: number;
  alreadySent: number;
};

const EMPTY: ReportRunResult = { enabled: true, kinds: [], sent: 0, failed: 0, skipped: 0, alreadySent: 0 };
const LIMIT_TITLE = "Limite diário de e-mails atingido";

/** Desligado por padrão: precisa da flag e da chave do Resend. */
export function reportEmailsStatus(env: NodeJS.ProcessEnv = process.env): { enabled: boolean; reason?: string } {
  if (env.REPORTS_EMAIL_ENABLED !== "true") return { enabled: false, reason: "REPORTS_EMAIL_ENABLED não está ligado" };
  if (!env.RESEND_API_KEY) return { enabled: false, reason: "RESEND_API_KEY ausente" };
  return { enabled: true };
}

type Recipient = {
  userId: string;
  name: string;
  email: string;
  sectorId?: string;
  scopeLabel: string;
};

function wantsEmails(prefs: unknown) {
  return parseNotificationPrefs(prefs as never).emailReports;
}

/** Líder ativo de cada setor ativo; um líder de dois setores recebe dois e-mails. */
async function leaderRecipients(): Promise<Recipient[]> {
  const sectors = await db.sector.findMany({
    where: { isActive: true, leaderId: { not: null } },
    select: {
      id: true,
      name: true,
      leader: { select: { id: true, name: true, email: true, status: true, userType: true, notificationPrefs: true } },
    },
  });
  return sectors.flatMap((s) =>
    s.leader &&
    s.leader.status === UserStatus.ACTIVE &&
    s.leader.userType !== UserType.EXTERNAL_CLIENT &&
    wantsEmails(s.leader.notificationPrefs)
      ? [{ userId: s.leader.id, name: s.leader.name, email: s.leader.email, sectorId: s.id, scopeLabel: `Setor ${s.name}` }]
      : []
  );
}

async function managementRecipients(): Promise<Recipient[]> {
  const users = await db.user.findMany({
    where: { status: UserStatus.ACTIVE, userType: { in: [UserType.ADMIN, UserType.MANAGEMENT] } },
    select: { id: true, name: true, email: true, notificationPrefs: true },
  });
  return users
    .filter((u) => wantsEmails(u.notificationPrefs))
    .map((u) => ({ userId: u.id, name: u.name, email: u.email, scopeLabel: "Agência" }));
}

async function record(userId: string, kind: ReportKind, periodKey: string, status: DeliveryStatus, error?: string) {
  await db.reportDelivery.upsert({
    where: { userId_kind_periodKey: { userId, kind, periodKey } },
    create: { userId, kind, periodKey, status, error: error ?? null },
    update: { status, error: error ?? null },
  });
}

async function notifyLimitReached(now: Date) {
  const since = new Date(startOfDayMs(dayKey(now)));
  const already = await db.notification.findFirst({
    where: { title: LIMIT_TITLE, createdAt: { gte: since } },
    select: { id: true },
  });
  if (already) return;
  const managers = await db.user.findMany({
    where: { status: UserStatus.ACTIVE, userType: { in: [UserType.ADMIN, UserType.MANAGEMENT] } },
    select: { id: true },
  });
  await Promise.all(
    managers.map((m) =>
      createNotification({
        userId: m.id,
        type: "OTHER",
        title: LIMIT_TITLE,
        message: `O plano gratuito do Resend permite 100 e-mails por dia. Os resumos que passaram de ${DAILY_EMAIL_LIMIT} ficaram para a próxima rodada.`,
        link: "/configuracoes/notificacoes",
      })
    )
  );
}

/**
 * Envia os resumos que vencem hoje: o diário dos líderes e o semanal da
 * gestão. Um envio por pessoa e período (nada reenvia o que já saiu), para
 * em `DAILY_EMAIL_LIMIT` no dia e a falha de uma pessoa não derruba as outras.
 */
export async function runReportEmails(now: Date = new Date()): Promise<ReportRunResult> {
  const status = reportEmailsStatus();
  if (!status.enabled) return { ...EMPTY, enabled: false, reason: status.reason };

  const kinds = dueReportKinds(now);
  const result: ReportRunResult = { ...EMPTY, kinds };
  if (kinds.length === 0) return result;

  let sentToday = await db.reportDelivery.count({
    where: { status: "SENT", createdAt: { gte: new Date(startOfDayMs(dayKey(now))) } },
  });
  let limitHit = false;
  const summaries = new Map<string, ReturnType<typeof getPerformanceSummary>>();

  for (const kind of kinds) {
    const period = reportPeriod(kind, now);
    const recipients = kind === "LEADER_DAILY" ? await leaderRecipients() : await managementRecipients();

    for (const r of recipients) {
      const periodKey = periodKeyFor(kind, period, r.sectorId);
      try {
        const existing = await db.reportDelivery.findUnique({
          where: { userId_kind_periodKey: { userId: r.userId, kind, periodKey } },
          select: { status: true },
        });
        if (existing?.status === "SENT") {
          result.alreadySent += 1;
          continue;
        }
        if (sentToday >= DAILY_EMAIL_LIMIT) {
          limitHit = true;
          result.skipped += 1;
          await record(r.userId, kind, periodKey, "SKIPPED", "limite diário");
          continue;
        }

        const scopeKey = `${kind}|${r.sectorId ?? ""}`;
        let pending = summaries.get(scopeKey);
        if (!pending) {
          pending = getPerformanceSummary({
            scope: r.sectorId ? { sectorId: r.sectorId } : {},
            range: { from: period.from, to: period.to },
            previousRange: period.previous,
            now,
          });
          summaries.set(scopeKey, pending);
        }
        const [summary, goalRows, objectiveRows] = await Promise.all([
          pending,
          listRunningGoals({ sectorId: r.sectorId }, now),
          listRunningObjectives({ sectorId: r.sectorId }, now),
        ]);
        const [goals, objectives] = await Promise.all([
          evaluateGoals(goalRows, now),
          evaluateObjectives(objectiveRows, { id: r.userId, canManage: false }, now),
        ]);

        const email = renderReportEmail({
          kind,
          recipientName: r.name,
          scopeLabel: r.scopeLabel,
          periodLabel: period.label,
          summary,
          goals,
          objectives,
          link: appUrl("/performance"),
        });
        const sent = await sendEmail({ to: r.email, subject: email.subject, html: email.html });
        if (sent.delivered) {
          sentToday += 1;
          result.sent += 1;
          await record(r.userId, kind, periodKey, "SENT");
        } else {
          result.failed += 1;
          await record(r.userId, kind, periodKey, "FAILED", "o Resend não confirmou o envio");
        }
      } catch (error) {
        result.failed += 1;
        const message = error instanceof Error ? error.message : "erro desconhecido";
        console.error(`[report-emails] ${kind} para ${r.userId} falhou`, error);
        await record(r.userId, kind, periodKey, "FAILED", message.slice(0, 300)).catch(() => undefined);
      }
    }
  }

  if (limitHit) await notifyLimitReached(now).catch((e) => console.error("[report-emails] aviso de limite", e));
  return result;
}
