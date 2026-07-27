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

export function getDashboardPath(userType: UserType): string {
  switch (userType) {
    case "ADMIN":
    case "MANAGEMENT":
      return "/gestao";
    case "SOCIAL_MEDIA":
      return "/painel/social-media";
    case "DESIGNER":
      return "/painel/design";
    case "VIDEOMAKER":
    case "VIDEO_EDITOR":
      return "/painel/video";
    case "OTHER":
      return "/painel/trafego";
    case "EXTERNAL_CLIENT":
      return "/portal";
    default:
      return "/dashboard";
  }
}

export type AuthRedirectTarget = ReturnType<typeof getDashboardPath>;
