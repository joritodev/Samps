import { revalidatePath } from "next/cache";

/** Agency operational views após mutações de demanda/assignment/timer.
 *
 * As rotas (app) legadas (/gestao, /quadros/*, /painel/*) não estão mais aqui —
 * são redirects 308 em next.config.mjs apontando para as rotas (agency),
 * e redirects não possuem cache de RSC para invalidar.
 */
export function revalidateOperationalViews(clientId?: string) {
  // Agency (live shell) — (agency) route group
  revalidatePath("/setores");
  revalidatePath("/setores/design");
  revalidatePath("/setores/video");
  revalidatePath("/setores/trafego");
  revalidatePath("/setores/social");
  revalidatePath("/meu-painel/design");
  revalidatePath("/meu-painel/video");
  revalidatePath("/meu-painel/trafego");
  revalidatePath("/meu-painel/social");
  revalidatePath("/painel-gestao");
  revalidatePath("/demandas");
  revalidatePath("/notificacoes");

  if (clientId) {
    revalidatePath(`/clientes/${clientId}/quadro`);
  }
}
