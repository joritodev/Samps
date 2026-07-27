"use server";

import { auth } from "@/lib/auth";
import { getPostLoginRedirect, isAuthRoute } from "@/lib/auth/redirects";

/**
 * Decide para onde mandar o usuário logo após o login.
 * Respeita o `callbackUrl` quando ele aponta para uma rota interna válida,
 * senão cai no painel correspondente à função.
 */
export async function resolveLoginRedirect(
  callbackUrl?: string | null
): Promise<string> {
  const session = await auth();
  if (!session?.user) return "/login";

  const home =
    getPostLoginRedirect(
      session.user.userType,
      Boolean(session.user.mustResetPassword)
    ) || "/demandas";

  if (session.user.mustResetPassword) return home;

  if (
    typeof callbackUrl === "string" &&
    callbackUrl.startsWith("/") &&
    !isAuthRoute(callbackUrl)
  ) {
    return callbackUrl;
  }

  return home;
}
