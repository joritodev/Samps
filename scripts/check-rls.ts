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

  const unscoped = await prisma.demand.count();
  const asGestor = await withUserScope(gestor.id, (tx) => tx.demand.count());
  const asCliente = await withUserScope(cliente.id, (tx) => tx.demand.count());
  const visibleClients = await withUserScope(cliente.id, (tx) =>
    tx.client.findMany({ select: { name: true } })
  );

  // Consulta deliberadamente sem filtro: quem tem de barrar é o banco.
  const leaked = await withUserScope(cliente.id, (tx) =>
    tx.demand.findMany({ select: { clientId: true } })
  );
  const foreign = leaked.filter(
    (d) => !cliente.clientLinks.some((l) => l.clientId === d.clientId)
  );

  console.log(`sem escopo:        ${unscoped} demandas`);
  console.log(`gestão (view_all): ${asGestor} demandas`);
  console.log(`cliente externo:   ${asCliente} demandas`);
  console.log(
    `clientes visíveis: ${visibleClients.map((c) => c.name).join(", ") || "nenhum"}`
  );

  const ok =
    asGestor === unscoped && asCliente < unscoped && foreign.length === 0;

  console.log(
    ok
      ? "\nOK: consulta sem filtro foi recortada pelo banco."
      : `\nFALHA: ${foreign.length} demandas de outros clientes vazaram.`
  );

  if (!ok) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
