import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging slows every request a lot in dev; enable with PRISMA_LOG_QUERIES=1
    log:
      process.env.PRISMA_LOG_QUERIES === "1"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type ScopedClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

/**
 * Executa `fn` numa transação com `app.user_id` definido, ativando as policies
 * de RLS por cliente. Como `SET LOCAL` vive na transação, tudo que precisa do
 * recorte tem de rodar no `tx` recebido — o `db` global segue irrestrito, que
 * é o que migrations, seed e scripts administrativos precisam.
 */
export function withUserScope<T>(
  userId: string,
  fn: (tx: ScopedClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    // A role de conexão tem BYPASSRLS; `app_user` não, e é ela que faz as
    // policies valerem. Ambos os SET são locais à transação.
    await tx.$executeRawUnsafe("SET LOCAL ROLE app_user");
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
