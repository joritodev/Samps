import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/types/auth";

export function buildDemandVisibilityWhere(
  user: SessionUser,
  opts?: { ledSectorIds?: string[] }
): Prisma.DemandWhereInput {
  const isMgmt =
    user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  if (isMgmt) return {};

  const led = opts?.ledSectorIds?.filter(Boolean) ?? [];
  if (led.length > 0) {
    // Inclui demandas ainda sem sectorId (ex.: social em planejamento)
    // quando assignee/requester pertencem ao setor liderado.
    return {
      OR: [
        { sectorId: { in: led } },
        { assigneeId: user.id },
        { requesterId: user.id },
        { assignee: { sectorId: { in: led } } },
        { requester: { sectorId: { in: led } } },
      ],
    };
  }

  return {
    OR: [{ assigneeId: user.id }, { requesterId: user.id }],
  };
}
