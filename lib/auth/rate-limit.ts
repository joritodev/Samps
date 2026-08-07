import { db } from "@/lib/db";

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MINUTES = 15;

/** Regra pura, para poder testar sem banco. */
export function exceedsAttemptLimit(
  attempts: number,
  limit: number = LOGIN_MAX_ATTEMPTS
) {
  return attempts >= limit;
}

function windowStart() {
  return new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);
}

/**
 * Bloqueia por e-mail e, quando disponível, por IP. A checagem é feita antes de
 * comparar a senha, então nem o bcrypt roda em rajada de tentativas.
 */
export async function isLoginBlocked(
  email: string,
  ipAddress?: string | null
) {
  const since = windowStart();
  const normalized = email.toLowerCase().trim();

  const [byEmail, byIp] = await Promise.all([
    db.accessAttemptLog.count({
      where: { email: normalized, success: false, createdAt: { gte: since } },
    }),
    ipAddress
      ? db.accessAttemptLog.count({
          where: { ipAddress, success: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  return (
    exceedsAttemptLimit(byEmail) ||
    exceedsAttemptLimit(byIp, LOGIN_MAX_ATTEMPTS * 4)
  );
}
