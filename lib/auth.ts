import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "@auth/core/jwt";
import type { UserType } from "@prisma/client";
import { validateCredentials } from "@/lib/auth/credentials";
import type { SessionUser } from "@/types/auth";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return validateCredentials(
          String(credentials.email),
          String(credentials.password)
        );
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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

      return token;
    },
    async session({ session, token }) {
      session.user = tokenToSessionUser(token) as typeof session.user;
      return session;
    },
  },
});
