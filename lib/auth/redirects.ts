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
  "/painel-gestao",
  "/meu-painel",
  "/setores",
  "/demandas",
  "/clientes",
  "/agenda",
  "/performance",
  "/projetos",
  "/captacoes",
  "/equipe",
  "/perfil",
  "/historico",
  "/pesquisa",
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
    pathname.startsWith("/convite") ||
    pathname === "/first-access"
  );
}
