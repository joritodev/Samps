import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";

/** E-mail preferencial do mock de sessão (seed). */
export const AGENCY_MOCK_EMAIL = "gestao@samps.digital";

export type AgencyUserProfile = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
};

export async function getCurrentAgencyUser(): Promise<AgencyUserProfile | null> {
  try {
    const select = {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true,
    } as const;

    const byEmail = await db.user.findUnique({
      where: { email: AGENCY_MOCK_EMAIL },
      select,
    });
    if (byEmail) return byEmail;

    // Fallback se o e-mail do perfil foi alterado — seed tem 1 MANAGER.
    return await db.user.findFirst({
      where: { role: UserRole.MANAGER },
      orderBy: { createdAt: "asc" },
      select,
    });
  } catch (error) {
    console.error("getCurrentAgencyUser", error);
    return null;
  }
}

export function userInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
