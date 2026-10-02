import { UserStatus, UserType } from "@prisma/client";
import { GoalsBoard } from "@/components/performance/goals-board";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import { evaluateGoals, listGoalsForUser } from "@/lib/services/goals.service";

export default async function PerformanceGoalsPage() {
  const user = await requirePermission("productivity.view");
  const canManage = hasPermission(user.permissions, "goals.manage");

  const [goals, sectors, people] = await Promise.all([
    listGoalsForUser(user).then((rows) => evaluateGoals(rows)),
    canManage
      ? db.sector.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canManage
      ? db.user.findMany({
          where: { status: UserStatus.ACTIVE, userType: { not: UserType.EXTERNAL_CLIENT } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return <GoalsBoard goals={goals} canManage={canManage} sectors={sectors} people={people} />;
}
