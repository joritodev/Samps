import { describe, expect, it } from "vitest";
import { buildPerformanceReport } from "./performance.service";

const from = new Date(2026, 7, 1, 0, 0, 0, 0);
const to = new Date(2026, 7, 31, 23, 59, 59, 999);

describe("buildPerformanceReport", () => {
  it("aggregates deliveries, deadlines, rework, and time by user", () => {
    const report = buildPerformanceReport(
      [
        {
          id: "demand-1",
          dueDate: new Date("2026-08-10T12:00:00.000Z"),
          productionCompletedAt: new Date("2026-08-10T12:00:00.000Z"),
          assignee: { id: "user-1", name: "Ana" },
          contentType: { id: "type-1", name: "Reel" },
          workSessions: [
            {
              userId: "user-1",
              stage: "PRODUCTION",
              totalActiveSeconds: 120,
              startedAt: new Date("2026-08-09T10:00:00.000Z"),
              endedAt: new Date("2026-08-09T10:02:00.000Z"),
            },
            {
              userId: "user-1",
              stage: "ADJUSTMENT",
              totalActiveSeconds: 60,
              startedAt: new Date("2026-08-10T11:00:00.000Z"),
              endedAt: new Date("2026-08-10T11:01:00.000Z"),
            },
          ],
        },
        {
          id: "demand-2",
          dueDate: new Date("2026-08-15T12:00:00.000Z"),
          productionCompletedAt: new Date("2026-08-16T12:00:00.000Z"),
          assignee: { id: "user-1", name: "Ana" },
          contentType: { id: "type-1", name: "Reel" },
          workSessions: [
            {
              userId: "user-1",
              stage: "PRODUCTION",
              totalActiveSeconds: 300,
              startedAt: new Date("2026-08-16T10:00:00.000Z"),
              endedAt: new Date("2026-08-16T10:05:00.000Z"),
            },
            {
              userId: "user-1",
              stage: "ADJUSTMENT",
              totalActiveSeconds: 999,
              startedAt: new Date("2026-07-31T10:00:00.000Z"),
              endedAt: new Date("2026-07-31T10:10:00.000Z"),
            },
          ],
        },
        {
          id: "demand-3",
          dueDate: null,
          productionCompletedAt: new Date("2026-08-20T12:00:00.000Z"),
          assignee: { id: "user-2", name: "Bia" },
          contentType: null,
          workSessions: [],
        },
      ],
      { from, to },
    );

    expect(report.from).toBe("2026-08-01");
    expect(report.to).toBe("2026-08-31");
    expect(report.byUser).toEqual([
      {
        userId: "user-1",
        name: "Ana",
        deliveries: 2,
        onTime: 1,
        withDueDate: 2,
        onTimeRate: 0.5,
        reworkSessions: 1,
        avgSecondsByType: [
          {
            contentTypeId: "type-1",
            name: "Reel",
            avgSeconds: 240,
            n: 2,
          },
        ],
      },
      {
        userId: "user-2",
        name: "Bia",
        deliveries: 1,
        onTime: 0,
        withDueDate: 0,
        onTimeRate: null,
        reworkSessions: 0,
        avgSecondsByType: [
          {
            contentTypeId: null,
            name: "Sem tipo",
            avgSeconds: 0,
            n: 1,
          },
        ],
      },
    ]);
  });

  it("includes unassigned deliveries only in content type statistics", () => {
    const report = buildPerformanceReport(
      [
        {
          id: "demand-1",
          dueDate: null,
          productionCompletedAt: new Date("2026-08-05T12:00:00.000Z"),
          assignee: null,
          contentType: null,
          workSessions: [
            {
              userId: "user-9",
              stage: "ADJUSTMENT",
              totalActiveSeconds: 30,
              startedAt: new Date("2026-08-05T10:00:00.000Z"),
              endedAt: new Date("2026-08-05T10:00:30.000Z"),
            },
          ],
        },
      ],
      { from, to },
    );

    expect(report.byUser).toEqual([]);
    expect(report.byContentType).toEqual([
      {
        contentTypeId: null,
        name: "Sem tipo",
        n: 1,
        volume: 1,
        avgSeconds: 30,
        medianSeconds: 30,
        stdDevSeconds: null,
      },
    ]);
  });

  it("uses endedAt or startedAt in range for elapsed time but endedAt only for rework", () => {
    const report = buildPerformanceReport(
      [
        {
          id: "demand-1",
          dueDate: null,
          productionCompletedAt: new Date("2026-08-05T12:00:00.000Z"),
          assignee: { id: "user-1", name: "Ana" },
          contentType: { id: "type-1", name: "Post" },
          workSessions: [
            {
              userId: "user-1",
              stage: "ADJUSTMENT",
              totalActiveSeconds: 90,
              startedAt: new Date("2026-08-05T10:00:00.000Z"),
              endedAt: null,
            },
            {
              userId: "user-1",
              stage: "PRODUCTION",
              totalActiveSeconds: 500,
              startedAt: new Date("2026-07-30T10:00:00.000Z"),
              endedAt: new Date("2026-07-30T10:10:00.000Z"),
            },
          ],
        },
      ],
      { from, to },
    );

    expect(report.byUser[0]?.reworkSessions).toBe(0);
    expect(report.byUser[0]?.avgSecondsByType[0]?.avgSeconds).toBe(90);
    expect(report.byContentType[0]?.avgSeconds).toBe(90);
  });

  it("sorts both tables by descending delivery count", () => {
    const rows = [
      {
        id: "demand-1",
        dueDate: null,
        productionCompletedAt: new Date("2026-08-05T12:00:00.000Z"),
        assignee: { id: "user-1", name: "Ana" },
        contentType: { id: "type-1", name: "Reel" },
        workSessions: [],
      },
      {
        id: "demand-2",
        dueDate: null,
        productionCompletedAt: new Date("2026-08-06T12:00:00.000Z"),
        assignee: { id: "user-2", name: "Bia" },
        contentType: { id: "type-2", name: "Post" },
        workSessions: [],
      },
      {
        id: "demand-3",
        dueDate: null,
        productionCompletedAt: new Date("2026-08-07T12:00:00.000Z"),
        assignee: { id: "user-2", name: "Bia" },
        contentType: { id: "type-2", name: "Post" },
        workSessions: [],
      },
    ];

    const report = buildPerformanceReport(rows, { from, to });

    expect(report.byUser.map((row) => row.userId)).toEqual([
      "user-2",
      "user-1",
    ]);
    expect(
      report.byContentType.map((row) => row.contentTypeId),
    ).toEqual(["type-2", "type-1"]);
  });
});
