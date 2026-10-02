import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Compara em tempo constante; tamanhos diferentes já reprovam. */
function validBearer(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Porta dos endpoints chamados pelo Vercel Cron. Devolve a resposta de recusa,
 * ou null quando pode seguir. Sem `CRON_SECRET` o endpoint fica fechado (503):
 * nunca roda aberto por esquecimento. O middleware não cobre `/api`, então a
 * checagem é do próprio endpoint.
 */
export function rejectUnlessCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 503 });
  }
  if (!validBearer(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return null;
}
