import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions/check";
import { canSeeSettingsSection } from "@/lib/agency/settings-access";

/** Bloqueia deep-link em seção que o usuário não deveria ver no hub. */
export async function requireSettingsSection(href: string) {
  const user = await requireAuth();
  if (!canSeeSettingsSection(user.permissions, href)) {
    redirect("/configuracoes");
  }
  return user;
}
