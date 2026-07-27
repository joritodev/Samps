import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isAuthPage =
        pathname === "/login" ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password") ||
        pathname === "/first-access";

      if (isAuthPage) {
        if (isLoggedIn && pathname === "/login") {
          return false;
        }
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
