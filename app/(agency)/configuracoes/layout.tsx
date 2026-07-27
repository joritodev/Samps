import { requireAuth } from "@/lib/permissions/check";

/** Configurações é aberta a qualquer usuário autenticado; cada seção decide o resto. */
export default async function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  return <>{children}</>;
}
