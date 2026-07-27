import { PerformanceDashboard } from "@/components/agency/performance-dashboard";
import { requirePermission } from "@/lib/permissions/check";
import { getIndicators } from "@/lib/services/indicators.service";

export default async function PerformancePage() {
  const user = await requirePermission("productivity.view");
  const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  const scope = {
    userId: isMgmt ? undefined : user.id,
    sectorId: isMgmt ? undefined : user.sectorId ?? undefined,
  };

  const [today, week, month] = await Promise.all([
    getIndicators({ period: "today", ...scope }),
    getIndicators({ period: "week", ...scope }),
    getIndicators({ period: "month", ...scope }),
  ]);

  return <PerformanceDashboard today={today} week={week} month={month} />;
}
