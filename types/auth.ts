import type { UserType } from "@prisma/client";
import type { PermissionCode } from "@/lib/permissions/codes";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  roleId: string;
  roleName: string;
  sectorId?: string | null;
  sectorName?: string | null;
  status: string;
  avatarUrl?: string | null;
  mustResetPassword: boolean;
  permissions: string[];
  clientIds: string[];
  impersonatingClientId?: string | null;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    userType: UserType;
    roleId: string;
    roleName: string;
    sectorId?: string | null;
    sectorName?: string | null;
    status: string;
    avatarUrl?: string | null;
    mustResetPassword: boolean;
    permissions: string[];
    clientIds: string[];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    email?: string;
    name?: string;
    userType: UserType;
    roleId: string;
    roleName: string;
    sectorId?: string | null;
    sectorName?: string | null;
    status: string;
    avatarUrl?: string | null;
    mustResetPassword: boolean;
    permissions: string[];
    clientIds: string[];
    impersonatingClientId?: string | null;
  }
}

export function getPersonalPanelPath(userType: UserType): string | null {
  switch (userType) {
    case "DESIGNER":
      return "/meu-painel/design";
    case "VIDEOMAKER":
    case "VIDEO_EDITOR":
      return "/meu-painel/video";
    case "SOCIAL_MEDIA":
      return "/meu-painel/social";
    case "OTHER":
      return "/meu-painel/trafego";
    default:
      return null;
  }
}

/** Colaboradores operacionais de setor — não veem o quadro geral /setores. */
export function isSectorCollaborator(userType: UserType): boolean {
  return getPersonalPanelPath(userType) !== null;
}

export function getDashboardPath(userType: UserType): string {
  const panel = getPersonalPanelPath(userType);
  if (panel) return panel;

  switch (userType) {
    case "ADMIN":
    case "MANAGEMENT":
      return "/painel-gestao";
    case "EXTERNAL_CLIENT":
      return "/portal";
    default:
      return "/demandas";
  }
}

export function getPanelPathForSectorSlug(slug: string): string {
  if (slug === "social" || slug === "social-media") return "/meu-painel/social";
  if (slug === "video") return "/meu-painel/video";
  if (slug === "trafego") return "/meu-painel/trafego";
  return "/meu-painel/design";
}

/** Setor operacional do colaborador — null para gestão/admin/cliente. */
export function getSectorSlugForUserType(userType: UserType): string | null {
  switch (userType) {
    case "DESIGNER":
      return "design";
    case "VIDEOMAKER":
    case "VIDEO_EDITOR":
      return "video";
    case "SOCIAL_MEDIA":
      return "social";
    case "OTHER":
      return "trafego";
    default:
      return null;
  }
}

export type AuthRedirectTarget = ReturnType<typeof getDashboardPath>;
