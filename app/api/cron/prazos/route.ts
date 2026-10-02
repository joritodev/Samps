import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDeadlineNotifications } from "@/lib/services/deadline-notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Compara em tempo constante; tamanhos diferentes já reprovam. */
function validBearer(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Chamado pelo Vercel Cron (vercel.json). Sem `CRON_SECRET` configurado o
 * endpoint fica fechado (503): nunca roda aberto por esquecimento.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  if (!validBearer(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const result = await runDeadlineNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/prazos] falhou", e);
    return NextResponse.json({ error: "Falha ao gerar notificações." }, { status: 500 });
  }
}
