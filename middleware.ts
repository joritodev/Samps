import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Usa apenas `authConfig` (sem o provider de credenciais) porque o middleware
 * roda no edge runtime, onde Prisma e bcrypt não funcionam.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts|design-system).*)"],
};
