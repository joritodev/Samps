import { UserStatus, UserType } from "@prisma/client";
import { OkrBoard } from "@/components/performance/okr-board";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  evaluateObjectives,
  listObjectivesForUser,
  type OkrPeriodFilter,
} from "@/lib/services/okr.service";

const PERIODS: OkrPeriodFilter[] = ["atual", "anterior", "todos"];

export default async function PerformanceOkrsPage({
  searchParams,
}: {
  searchParams: { periodo?: string };
}) {
  const user = await requirePermission("productivity.view");
  const canManage = hasPermission(user.permissions, "goals.manage");
  const period = PERIODS.find((p) => p === searchParams.periodo) ?? "atual";

  const [objectives, sectors, people] = await Promise.all([
    listObjectivesForUser(user, { period }).then((rows) => evaluateObjectives(rows, user)),
    canManage
      ? db.sector.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    canManage
      ? db.user.findMany({
          where: { status: UserStatus.ACTIVE, userType: { not: UserType.EXTERNAL_CLIENT } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <OkrBoard
      objectives={objectives}
      period={period}
      canManage={canManage}
      sectors={sectors}
      people={people}
      currentUserId={user.id}
    />
  );
}
