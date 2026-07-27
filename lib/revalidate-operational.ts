import { revalidatePath } from "next/cache";

/** Agency + legacy operational views after demand/assignment/timer mutations. */
export function revalidateOperationalViews(clientId?: string) {
  // Agency (live shell)
  revalidatePath("/setores");
  revalidatePath("/setores/design");
  revalidatePath("/setores/video");
  revalidatePath("/setores/trafego");
  revalidatePath("/setores/social");
  revalidatePath("/meu-painel/design");
  revalidatePath("/meu-painel/video");
  revalidatePath("/meu-painel/social");
  revalidatePath("/painel-gestao");
  revalidatePath("/demandas");
  revalidatePath("/notificacoes");

  // Legacy (app) routes
  revalidatePath("/quadros/design");
  revalidatePath("/quadros/video");
  revalidatePath("/quadros/trafego");
  revalidatePath("/quadros/social-media");
  revalidatePath("/painel/design");
  revalidatePath("/painel/video");
  revalidatePath("/painel/social-media");
  revalidatePath("/gestao");

  if (clientId) {
    revalidatePath(`/clientes/${clientId}/quadro`);
  }
}
