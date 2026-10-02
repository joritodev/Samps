import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cron/auth";
import {
  runDeadlineNotifications,
  runUnassignedOverdueDigest,
} from "@/lib/services/deadline-notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chamado pelo Vercel Cron (vercel.json); a porta é `rejectUnlessCron`.
 */
export async function GET(req: Request) {
  const rejected = rejectUnlessCron(req);
  if (rejected) return rejected;
  // Um não bloqueia o outro: se o resumo da gestão falhar, os avisos de prazo saem.
  const [prazos, gestao] = await Promise.allSettled([
    runDeadlineNotifications(),
    runUnassignedOverdueDigest(),
  ]);
  for (const [name, r] of [["prazos", prazos], ["gestao", gestao]] as const) {
    if (r.status === "rejected") console.error(`[cron/prazos] ${name} falhou`, r.reason);
  }
  const failed = prazos.status === "rejected" || gestao.status === "rejected";
  return NextResponse.json(
    {
      ok: !failed,
      prazos: prazos.status === "fulfilled" ? prazos.value : { error: "falhou" },
      gestao: gestao.status === "fulfilled" ? gestao.value : { error: "falhou" },
    },
    { status: failed ? 500 : 200 }
  );
}
