import { WorkSessionStage, WorkSessionStatus } from "@prisma/client";
import { mean, median, onTimeRate, stdDev } from "@/lib/agency/performance-math";
import { db } from "@/lib/db";

export type ContentTypeStats = {
  contentTypeId: string | null;
  name: string;
  n: number;
  volume: number;
  avgSeconds: number | null;
  medianSeconds: number | null;
  stdDevSeconds: number | null;
};

export type UserRow = {
  userId: string;
  name: string;
  deliveries: number;
  onTime: number;
  withDueDate: number;
  onTimeRate: number | null;
  reworkSessions: number;
  avgSecondsByType: {
    contentTypeId: string | null;
    name: string;
    avgSeconds: number | null;
    n: number;
  }[];
};

export type PerformanceReport = {
  from: string;
  to: string;
  byUser: UserRow[];
  byContentType: ContentTypeStats[];
};

export type PerformanceReportRow = {
  id: string;
  dueDate: Date | null;
  productionCompletedAt: Date | null;
  assignee: { id: string; name: string } | null;
  contentType: { id: string; name: string } | null;
  workSessions: {
    userId: string;
    stage: string;
    totalActiveSeconds: number;
    startedAt: Date;
    endedAt: Date | null;
  }[];
};

type ContentTypeBucket = {
  contentTypeId: string | null;
  name: string;
  secondsByDemand: number[];
};

type UserBucket = {
  userId: string;
  name: string;
  deliveries: number;
  onTime: number;
  withDueDate: number;
  reworkSessions: number;
  secondsByType: Map<string, ContentTypeBucket>;
};

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isInRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to;
}

function isSessionTimeInRange(
  session: PerformanceReportRow["workSessions"][number],
  from: Date,
  to: Date,
): boolean {
  if (session.endedAt) return isInRange(session.endedAt, from, to);
  return isInRange(session.startedAt, from, to);
}

function contentTypeKey(contentTypeId: string | null): string {
  return contentTypeId ?? "__without_content_type__";
}

export function buildPerformanceReport(
  rows: PerformanceReportRow[],
  range: { from: Date; to: Date },
): PerformanceReport {
  const byUser = new Map<string, UserBucket>();
  const byContentType = new Map<string, ContentTypeBucket>();

  for (const row of rows) {
    if (!row.productionCompletedAt) continue;

    const contentTypeId = row.contentType?.id ?? null;
    const contentTypeName = row.contentType?.name ?? "Sem tipo";
    const typeKey = contentTypeKey(contentTypeId);
    const sessionsInRange = row.workSessions.filter((session) =>
      isSessionTimeInRange(session, range.from, range.to),
    );
    const totalSeconds = sessionsInRange.reduce(
      (total, session) => total + session.totalActiveSeconds,
      0,
    );

    const typeBucket = byContentType.get(typeKey) ?? {
      contentTypeId,
      name: contentTypeName,
      secondsByDemand: [],
    };
    typeBucket.secondsByDemand.push(totalSeconds);
    byContentType.set(typeKey, typeBucket);

    if (!row.assignee) continue;

    const userBucket = byUser.get(row.assignee.id) ?? {
      userId: row.assignee.id,
      name: row.assignee.name,
      deliveries: 0,
      onTime: 0,
      withDueDate: 0,
      reworkSessions: 0,
      secondsByType: new Map<string, ContentTypeBucket>(),
    };

    userBucket.deliveries += 1;
    if (row.dueDate) {
      userBucket.withDueDate += 1;
      if (row.productionCompletedAt <= row.dueDate) {
        userBucket.onTime += 1;
      }
    }

    const userSeconds = sessionsInRange
      .filter((session) => session.userId === row.assignee?.id)
      .reduce((total, session) => total + session.totalActiveSeconds, 0);
    const userTypeBucket = userBucket.secondsByType.get(typeKey) ?? {
      contentTypeId,
      name: contentTypeName,
      secondsByDemand: [],
    };
    userTypeBucket.secondsByDemand.push(userSeconds);
    userBucket.secondsByType.set(typeKey, userTypeBucket);
    byUser.set(userBucket.userId, userBucket);
  }

  for (const row of rows) {
    for (const session of row.workSessions) {
      if (
        session.stage !== WorkSessionStage.ADJUSTMENT ||
        !session.endedAt ||
        !isInRange(session.endedAt, range.from, range.to)
      ) {
        continue;
      }

      const userBucket = byUser.get(session.userId);
      if (userBucket) userBucket.reworkSessions += 1;
    }
  }

  return {
    from: formatDate(range.from),
    to: formatDate(range.to),
    byUser: Array.from(byUser.values())
      .map(
        (bucket): UserRow => ({
          userId: bucket.userId,
          name: bucket.name,
          deliveries: bucket.deliveries,
          onTime: bucket.onTime,
          withDueDate: bucket.withDueDate,
          onTimeRate: onTimeRate(bucket.onTime, bucket.withDueDate),
          reworkSessions: bucket.reworkSessions,
          avgSecondsByType: Array.from(bucket.secondsByType.values()).map(
            (typeBucket) => ({
              contentTypeId: typeBucket.contentTypeId,
              name: typeBucket.name,
              avgSeconds: mean(typeBucket.secondsByDemand),
              n: typeBucket.secondsByDemand.length,
            }),
          ),
        }),
      )
      .sort(
        (a, b) =>
          b.deliveries - a.deliveries || a.name.localeCompare(b.name),
      ),
    byContentType: Array.from(byContentType.values())
      .map(
        (bucket): ContentTypeStats => ({
          contentTypeId: bucket.contentTypeId,
          name: bucket.name,
          n: bucket.secondsByDemand.length,
          volume: bucket.secondsByDemand.length,
          avgSeconds: mean(bucket.secondsByDemand),
          medianSeconds: median(bucket.secondsByDemand),
          stdDevSeconds: stdDev(bucket.secondsByDemand),
        }),
      )
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
  };
}

export async function getPerformanceReport(params: {
  from: Date;
  to: Date;
  assigneeId?: string;
  sectorId?: string;
  clientId?: string;
}): Promise<PerformanceReport> {
  const rows = await db.demand.findMany({
    where: {
      productionCompletedAt: { gte: params.from, lte: params.to },
      ...(params.assigneeId ? { assigneeId: params.assigneeId } : {}),
      ...(params.sectorId ? { sectorId: params.sectorId } : {}),
      ...(params.clientId ? { clientId: params.clientId } : {}),
    },
    select: {
      id: true,
      dueDate: true,
      productionCompletedAt: true,
      assignee: { select: { id: true, name: true } },
      contentType: { select: { id: true, name: true } },
      workSessions: {
        where: { status: WorkSessionStatus.COMPLETED },
        select: {
          userId: true,
          stage: true,
          totalActiveSeconds: true,
          startedAt: true,
          endedAt: true,
        },
      },
    },
  });

  return buildPerformanceReport(rows, {
    from: params.from,
    to: params.to,
  });
}
