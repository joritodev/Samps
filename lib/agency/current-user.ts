import { requireAuth } from "@/lib/permissions/check";
import type { SessionUser } from "@/types/auth";

export type AgencyUserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  userType: SessionUser["userType"];
  roleName: string;
  sectorName: string | null;
  permissions: string[];
  clientIds: string[];
};

/**
 * Usuário logado no shell da agência. Redireciona para /login quando não há
 * sessão — o middleware já barra antes, isto é a segunda linha de defesa.
 */
export async function getCurrentAgencyUser(): Promise<AgencyUserProfile> {
  const user = await requireAuth();

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    userType: user.userType,
    roleName: user.roleName,
    sectorName: user.sectorName ?? null,
    permissions: user.permissions,
    clientIds: user.clientIds,
  };
}