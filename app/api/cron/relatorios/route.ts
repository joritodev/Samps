import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron/auth";
import { dueReportKinds } from "@/lib/agency/report-emails";
import { runGoalCelebrations } from "@/lib/services/celebrations.service";
import { runOkrCheckInReminders } from "@/lib/services/okr-reminders.service";
import { runReportEmails } from "@/lib/services/report-emails.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Resumos por e-mail (diário dos líderes, semanal da gestão). Chamado pelo
 * Vercel Cron. Sem `CRON_SECRET` o endpoint fica fechado (503). Sem a flag
 * `REPORTS_EMAIL_ENABLED` e a chave do Resend, responde 200 e não envia nada.
 */
export async function GET(req: Request) {
  const rejected = rejectUnlessCron(req);
  if (rejected) return rejected;
  const now = new Date();
  // Independentes: se uma rotina falhar, as outras saem do mesmo jeito.
  const [emails, celebrations, reminders] = await Promise.allSettled([
    runReportEmails(now),
    runGoalCelebrations(now),
    // Cobrança de check-in na segunda, junto do resumo semanal.
    dueReportKinds(now).includes("MANAGEMENT_WEEKLY") ? runOkrCheckInReminders(now) : Promise.resolve(null),
  ]);
  const parts = { emails, celebrations, reminders };
  for (const [name, r] of Object.entries(parts)) {
    if (r.status === "rejected") console.error(`[cron/relatorios] ${name} falhou`, r.reason);
  }
  // Falha de envio aparece como erro no log do cron; o corpo diz quantos.
  const failed =
    Object.values(parts).some((r) => r.status === "rejected") ||
    (emails.status === "fulfilled" && emails.value.failed > 0);
  const value = (r: PromiseSettledResult<unknown>) => (r.status === "fulfilled" ? r.value : { error: "falhou" });
  return NextResponse.json(
    { ok: !failed, emails: value(emails), celebrations: value(celebrations), reminders: value(reminders) },
    { status: failed ? 500 : 200 }
  );
}
