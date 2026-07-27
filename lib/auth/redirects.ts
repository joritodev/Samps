import { UserType } from "@prisma/client";
import { getDashboardPath } from "@/types/auth";

export function getPostLoginRedirect(
  userType: UserType,
  mustResetPassword: boolean
): string {
  if (mustResetPassword) return "/first-access";
  return getDashboardPath(userType);
}

export const INTERNAL_ROUTES_PREFIX = [
  "/gestao",
  "/painel",
  "/dashboard",
  "/clientes",
  "/quadros",
  "/calendario",
  "/projetos",
  "/captacoes",
  "/equipe",
  "/usuarios",
  "/relatorios",
  "/configuracoes",
  "/notificacoes",
];

export const PORTAL_ROUTES_PREFIX = ["/portal"];

export function isInternalRoute(pathname: string) {
  return INTERNAL_ROUTES_PREFIX.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isPortalRoute(pathname: string) {
  return PORTAL_ROUTES_PREFIX.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname === "/first-access"
  );
}
