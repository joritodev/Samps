import { PrismaClient } from "@prisma/client";
import { withUserScope } from "../lib/db";

const prisma = new PrismaClient();

/**
 * Confere que as policies recortam por cliente dentro de `withUserScope` e que
 * fora dele (migrations, seed) o acesso segue irrestrito.
 */
async function main() {
  const [gestor, cliente] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: "gestao@samps.digital" } }),
    prisma.user.findUniqueOrThrow({
      where: { email: "cliente@samps.digital" },
      include: { clientLinks: true },
    }),
  ]);

  const allowedClientIds = new Set(cliente.clientLinks.map((l) => l.clientId));
  let failed = false;

  function report(label: string, ok: boolean, detail?: string) {
    console.log(
      ok ? `OK: ${label}` : `VAZAMENTO: ${label}${detail ? ` — ${detail}` : ""}`
    );
    if (!ok) failed = true;
  }

  const unscoped = await prisma.demand.count();
  const asGestor = await withUserScope(gestor.id, (tx) => tx.demand.count());
  const asCliente = await withUserScope(cliente.id, (tx) => tx.demand.count());

  report(
    "gestão vê o mesmo volume de demandas que fora do escopo",
    asGestor === unscoped,
    `gestor=${asGestor} unscoped=${unscoped}`
  );
  report(
    "cliente externo vê menos demandas que o total",
    asCliente < unscoped,
    `cliente=${asCliente} unscoped=${unscoped}`
  );

  const leakedDemands = await withUserScope(cliente.id, (tx) =>
    tx.demand.findMany({ select: { clientId: true } })
  );
  const foreignDemands = leakedDemands.filter(
    (d) => !allowedClientIds.has(d.clientId)
  );
  report(
    "demandas do cliente externo sem clientId estrangeiro",
    foreignDemands.length === 0,
    `${foreignDemands.length} linhas`
  );

  const visibleClients = await withUserScope(cliente.id, (tx) =>
    tx.client.findMany({ select: { id: true, name: true } })
  );
  const foreignClients = visibleClients.filter(
    (c) => !allowedClientIds.has(c.id)
  );
  report(
    "client.findMany sob escopo do cliente externo",
    foreignClients.length === 0 &&
      visibleClients.every((c) => allowedClientIds.has(c.id)),
    `visíveis=${visibleClients.map((c) => c.name).join(", ") || "nenhum"}`
  );

  const unscopedInternalComments = await prisma.comment.count({
    where: { visibility: "INTERNAL" },
  });
  const comments = await withUserScope(cliente.id, (tx) =>
    tx.comment.findMany({
      select: { id: true, visibility: true, demandId: true },
    })
  );
  const internalComments = comments.filter((c) => c.visibility === "INTERNAL");
  report(
    "comment.findMany sob escopo do cliente externo sem comentários INTERNAL",
    internalComments.length === 0,
    `${internalComments.length} internos / ${comments.length} total (unscoped INTERNAL=${unscopedInternalComments})`
  );
  if (unscopedInternalComments === 0) {
    console.log(
      "AVISO: não há Comment INTERNAL no banco — policy de comentário não foi exercitada com fixture."
    );
  }

  const unscopedSessions = await prisma.workSession.count();
  const sessions = await withUserScope(cliente.id, (tx) =>
    tx.workSession.findMany({ select: { id: true, demandId: true } })
  );
  report(
    "workSession.findMany sob escopo do cliente externo vazio",
    sessions.length === 0,
    `${sessions.length} sessões (unscoped=${unscopedSessions})`
  );
  if (unscopedSessions === 0) {
    console.log(
      "AVISO: não há WorkSession no banco — policy de sessão não foi exercitada com fixture."
    );
  }

  const attachments = await withUserScope(cliente.id, (tx) =>
    tx.attachment.findMany({
      select: {
        id: true,
        clientId: true,
        demandId: true,
        visibleToClient: true,
      },
    })
  );
  const allowedDemandIds = new Set(
    (
      await withUserScope(cliente.id, (tx) =>
        tx.demand.findMany({ select: { id: true } })
      )
    ).map((d) => d.id)
  );
  const foreignAttachments = attachments.filter((a) => {
    if (a.clientId && !allowedClientIds.has(a.clientId)) return true;
    if (!a.clientId && a.demandId && !allowedDemandIds.has(a.demandId)) {
      return true;
    }
    if (!a.clientId && !a.demandId) return true;
    return false;
  });
  report(
    "attachment.findMany sem anexos de outros clientes (incl. clientId null)",
    foreignAttachments.length === 0,
    `${foreignAttachments.length} estrangeiros / ${attachments.length} total`
  );

  console.log(
    `\nsem escopo:        ${unscoped} demandas\n` +
      `gestão (view_all): ${asGestor} demandas\n` +
      `cliente externo:   ${asCliente} demandas\n` +
      `clientes visíveis: ${visibleClients.map((c) => c.name).join(", ") || "nenhum"}`
  );

  if (failed) {
    console.log("\nFALHA: houve vazamento em pelo menos uma verificação.");
    process.exitCode = 1;
  } else {
    console.log("\nOK: todas as verificações de recorte passaram.");
  }
}

main().finally(() => prisma.$disconnect());
