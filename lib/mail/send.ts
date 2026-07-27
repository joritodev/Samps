import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL ?? "noreply@samps.digital";

const resend = apiKey ? new Resend(apiKey) : null;

export function appUrl(path: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

/**
 * Sem RESEND_API_KEY configurada o link vai para o console, para que o fluxo
 * continue utilizável em desenvolvimento.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  fallbackLog?: string;
}) {
  if (!resend) {
    console.info(
      `[email] RESEND_API_KEY ausente — e-mail para ${input.to} não enviado.`
    );
    if (input.fallbackLog) console.info(`[email] ${input.fallbackLog}`);
    return { delivered: false as const };
  }

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    console.error("[email] falha no envio:", error);
    return { delivered: false as const };
  }

  return { delivered: true as const };
}

export function emailLayout(input: {
  title: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
}) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f6f7f9;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin:0 0 16px">
        Samps Digital
      </p>
      <h1 style="font-size:20px;margin:0 0 12px;color:#111827">${input.title}</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 24px">${input.intro}</p>
      <a href="${input.ctaUrl}"
         style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600">
        ${input.ctaLabel}
      </a>
      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;line-height:1.6">
        ${input.footer ?? "Se você não solicitou este e-mail, pode ignorá-lo com segurança."}
      </p>
    </div>
  </div>`;
}
