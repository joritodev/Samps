import { AuditAction } from "@prisma/client";
import { AuditLogView } from "@/components/agency/audit-log-view";
import { requirePermission } from "@/lib/permissions/check";
import { listAuditActors, listAuditLogs } from "@/lib/services/audit.service";

const PERIODS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

function sinceFrom(period?: string) {
  const days = PERIODS[period ?? "30d"];
  if (days == null) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: { action?: string; user?: string; period?: string };
}) {
  await requirePermission("history.view");

  const action =
    searchParams.action && searchParams.action in AuditAction
      ? (searchParams.action as AuditAction)
      : undefined;

  const [logs, actors] = await Promise.all([
    listAuditLogs({
      action,
      userId: searchParams.user || undefined,
      since: sinceFrom(searchParams.period),
      limit: 200,
    }),
    listAuditActors(),
  ]);

  return (
    <AuditLogView
      logs={logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        createdAt: log.createdAt.toISOString(),
        userName: log.user?.name ?? "Sistema",
        previousValue: log.previousValue,
        newValue: log.newValue,
      }))}
      actors={actors}
      filters={{
        action: searchParams.action ?? "",
        user: searchParams.user ?? "",
        period: searchParams.period ?? "30d",
      }}
    />
  );
}
