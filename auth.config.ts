import type { NextAuthConfig } from "next-auth";
import type { JWT } from "@auth/core/jwt";
import type { UserType } from "@prisma/client";
import type { SessionUser } from "@/types/auth";
import { getDashboardPath } from "@/types/auth";
import { isAuthRoute, isPortalRoute } from "@/lib/auth/redirects";

/**
 * Config compartilhada entre o middleware (edge) e o handler de API (node).
 * Só pode conter código compatível com o edge runtime — nada de Prisma ou
 * bcrypt aqui. O provider de credenciais vive em `lib/auth.ts`.
 */

function tokenToSessionUser(token: JWT): SessionUser {
  return {
    id: String(token.id),
    email: String(token.email ?? ""),
    name: String(token.name ?? ""),
    userType: token.userType as UserType,
    roleId: String(token.roleId),
    roleName: String(token.roleName),
    sectorId: token.sectorId as string | null | undefined,
    sectorName: token.sectorName as string | null | undefined,
    status: String(token.status),
    avatarUrl: token.avatarUrl as string | null | undefined,
    mustResetPassword: Boolean(token.mustResetPassword),
    permissions: (token.permissions as string[]) ?? [],
    clientIds: (token.clientIds as string[]) ?? [],
    impersonatingClientId: (token.impersonatingClientId as string | null) ?? null,
  };
}

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const user = auth?.user;
      const { nextUrl } = request;
      const pathname = nextUrl.pathname;
      // Server Actions (ex.: resolveLoginRedirect pós-login) chegam como POST
      // na rota atual. Um redirect aqui aborta a action e o client recebe undefined.
      const isServerAction = request.headers.has("next-action");

      if (!user) {
        // Páginas de autenticação são as únicas abertas a visitantes.
        return isAuthRoute(pathname);
      }

      const isExternal = user.userType === "EXTERNAL_CLIENT";
      const home = getDashboardPath(user.userType);

      // Quem ainda não trocou a senha inicial fica preso no primeiro acesso.
      if (user.mustResetPassword && pathname !== "/first-access") {
        if (isServerAction) return true;
        return Response.redirect(new URL("/first-access", nextUrl));
      }

      if (isAuthRoute(pathname)) {
        if (pathname === "/first-access" && user.mustResetPassword) return true;
        if (isServerAction) return true;
        return Response.redirect(new URL(home, nextUrl));
      }

      // Cliente externo vive no portal; a operação interna fica invisível.
      if (isExternal && !isPortalRoute(pathname)) {
        return Response.redirect(new URL("/portal", nextUrl));
      }
      if (!isExternal && isPortalRoute(pathname)) {
        // Gestão só entra no portal via "Visualizar como cliente".
        if (!user.permissions.includes("portal.view_as_client")) {
          return Response.redirect(new URL(home, nextUrl));
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.userType = user.userType;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.sectorId = user.sectorId;
        token.sectorName = user.sectorName;
        token.status = user.status;
        token.avatarUrl = user.avatarUrl;
        token.mustResetPassword = user.mustResetPassword;
        token.permissions = user.permissions;
        token.clientIds = user.clientIds;
      }

      if (trigger === "update" && session?.impersonatingClientId !== undefined) {
        token.impersonatingClientId = session.impersonatingClientId;
      }

      if (trigger === "update" && session?.refreshed) {
        token.name = session.refreshed.name ?? token.name;
        token.email = session.refreshed.email ?? token.email;
        token.avatarUrl = session.refreshed.avatarUrl ?? token.avatarUrl;
        token.mustResetPassword =
          session.refreshed.mustResetPassword ?? token.mustResetPassword;
      }

      return token;
    },

    async session({ session, token }) {
      session.user = tokenToSessionUser(token) as typeof session.user;
      return session;
    },
  },
} satisfies NextAuthConfig;
