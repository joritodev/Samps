import { DemandStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { demandCycleViolations } from "./demand-cycle";
import {
  SEED_DEMANDS,
  assertSeedDemandsFollowCycle,
  operationalFieldsForSeedDemand,
  seedDemandCycleSnapshot,
} from "../../prisma/seed-demands";

describe("SEED_DEMANDS", () => {
  it("cobre o ciclo vivo sem status legado OPEN/AVAILABLE/DONE", () => {
    const statuses = new Set(SEED_DEMANDS.map((d) => d.status));
    expect(statuses.has(DemandStatus.PENDING_PLANNING)).toBe(true);
    expect(statuses.has(DemandStatus.DEMANDED)).toBe(true);
    expect(statuses.has(DemandStatus.IN_PRODUCTION)).toBe(true);
    expect(statuses.has(DemandStatus.ADJUSTMENTS)).toBe(true);
    expect(statuses.has(DemandStatus.IN_REVIEW)).toBe(true);
    expect(statuses.has(DemandStatus.APPROVED)).toBe(true);
    expect(statuses.has(DemandStatus.SCHEDULED)).toBe(true);
    expect(statuses.has(DemandStatus.PUBLISHED)).toBe(true);
    expect(statuses.has(DemandStatus.OPEN)).toBe(false);
    expect(statuses.has(DemandStatus.AVAILABLE)).toBe(false);
    expect(statuses.has(DemandStatus.DONE)).toBe(false);
  });

  it("nao coloca o revisor como assignee em revisao", () => {
    const inReview = SEED_DEMANDS.filter(
      (d) => d.status === DemandStatus.IN_REVIEW
    );
    expect(inReview.length).toBeGreaterThan(0);
    for (const demand of inReview) {
      expect(demand.assigneeKey).not.toBe("social");
      expect(demand.assigneeKey).not.toBe("gestor");
    }
  });

  it("marca demanda assumida como atribuida, nao disponivel", () => {
    const claimed = SEED_DEMANDS.find(
      (d) => d.status === DemandStatus.DEMANDED && d.assigneeKey
    );
    expect(claimed).toBeTruthy();
    const ops = operationalFieldsForSeedDemand(
      claimed!,
      claimed!.assigneeKey ?? null
    );
    expect(ops.boardColumn).toBe("assigned");
    expect(ops.internalStatus).toBe("Atribuída");
    expect(ops.assignmentStatus).toBe("ASSIGNED");
  });

  it("passa nas invariantes do ciclo vivo", () => {
    expect(() => assertSeedDemandsFollowCycle()).not.toThrow();
    for (const demand of SEED_DEMANDS) {
      const gaps = demandCycleViolations(
        seedDemandCycleSnapshot(demand, demand.assigneeKey ?? null)
      );
      expect(gaps).toEqual([]);
    }
  });
});
