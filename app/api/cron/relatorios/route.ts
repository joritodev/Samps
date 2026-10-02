import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron/auth";
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
  try {
    const result = await runReportEmails();
    // Falha de envio aparece como erro no log do cron; o corpo diz quantos.
    const ok = result.failed === 0;
    return NextResponse.json({ ok, ...result }, { status: ok ? 200 : 500 });
  } catch (error) {
    console.error("[cron/relatorios] falhou", error);
    return NextResponse.json({ ok: false, error: "Falha ao enviar os resumos." }, { status: 500 });
  }
}
