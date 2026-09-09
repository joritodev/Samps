import { DemandStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  assignmentStatusForDemandStatus,
  boardColumnForDemandStatus,
  demandCycleViolations,
  internalStatusForDemandStatus,
} from "./demand-cycle";

describe("boardColumnForDemandStatus", () => {
  it("alinha o kanban ao ciclo vivo", () => {
    expect(boardColumnForDemandStatus(DemandStatus.PENDING_PLANNING)).toBe(
      "todo"
    );
    expect(boardColumnForDemandStatus(DemandStatus.DEMANDED)).toBe("available");
    expect(
      boardColumnForDemandStatus(DemandStatus.DEMANDED, { assigneeId: "u1" })
    ).toBe("assigned");
    expect(boardColumnForDemandStatus(DemandStatus.IN_PRODUCTION)).toBe(
      "production"
    );
    expect(boardColumnForDemandStatus(DemandStatus.IN_REVIEW)).toBe("review");
    expect(boardColumnForDemandStatus(DemandStatus.ADJUSTMENTS)).toBe(
      "adjustments"
    );
    expect(boardColumnForDemandStatus(DemandStatus.APPROVED)).toBe("review");
    expect(boardColumnForDemandStatus(DemandStatus.PUBLISHED)).toBe("done");
  });
});

describe("internalStatusForDemandStatus", () => {
  it("usa os textos das actions atuais", () => {
    expect(internalStatusForDemandStatus(DemandStatus.PENDING_PLANNING)).toBe(
      "Pendente de planejamento"
    );
    expect(internalStatusForDemandStatus(DemandStatus.DEMANDED)).toBe(
      "Disponível no setor"
    );
    expect(internalStatusForDemandStatus(DemandStatus.IN_REVIEW)).toBe(
      "Aguardando revisão"
    );
    expect(internalStatusForDemandStatus(DemandStatus.APPROVED)).toBe(
      "Aprovado — aguardando publicação"
    );
    expect(internalStatusForDemandStatus(DemandStatus.PUBLISHED)).toBe(
      "Publicado"
    );
  });
});

describe("assignmentStatusForDemandStatus", () => {
  it("nao atribui em planejamento", () => {
    expect(
      assignmentStatusForDemandStatus(DemandStatus.PENDING_PLANNING)
    ).toBeNull();
  });

  it("mapeia o ciclo operacional", () => {
    expect(assignmentStatusForDemandStatus(DemandStatus.DEMANDED)).toBe(
      "AVAILABLE"
    );
    expect(
      assignmentStatusForDemandStatus(DemandStatus.DEMANDED, {
        assigneeId: "user-1",
      })
    ).toBe("ASSIGNED");
    expect(assignmentStatusForDemandStatus(DemandStatus.IN_PRODUCTION)).toBe(
      "IN_PROGRESS"
    );
    expect(assignmentStatusForDemandStatus(DemandStatus.ADJUSTMENTS)).toBe(
      "ADJUSTMENT"
    );
    expect(assignmentStatusForDemandStatus(DemandStatus.PUBLISHED)).toBe(
      "DONE"
    );
  });
});

describe("demandCycleViolations", () => {
  it("aceita planejamento sem briefing travado", () => {
    expect(
      demandCycleViolations({
        status: DemandStatus.PENDING_PLANNING,
        boardColumn: "todo",
        title: "Feed — rascunho",
      })
    ).toEqual([]);
  });

  it("exige briefing travado, setor, descricao e video apos demandar", () => {
    const gaps = demandCycleViolations({
      status: DemandStatus.DEMANDED,
      boardColumn: "available",
      title: "Reels — sem campos",
      demandType: "REEL",
    });
    expect(gaps.join(" ")).toMatch(/briefing/);
    expect(gaps.join(" ")).toMatch(/setor/);
    expect(gaps.join(" ")).toMatch(/descrição/);
    expect(gaps.join(" ")).toMatch(/duração/);
  });

  it("exige material para revisao e link para publicado", () => {
    expect(
      demandCycleViolations({
        status: DemandStatus.IN_REVIEW,
        boardColumn: "review",
        title: "Feed",
        briefingLockedAt: new Date(),
        sectorId: "sec",
        description: "ok",
        assigneeId: "u1",
        demandType: "FEED",
      }).some((g) => g.includes("materialUrl"))
    ).toBe(true);

    expect(
      demandCycleViolations({
        status: DemandStatus.PUBLISHED,
        boardColumn: "done",
        title: "Feed",
        briefingLockedAt: new Date(),
        sectorId: "sec",
        description: "ok",
        assigneeId: "u1",
        materialUrl: "https://drive.google.com/demo/x",
        demandType: "FEED",
        visibleToClient: true,
      }).some((g) => g.includes("publishedUrl"))
    ).toBe(true);
  });

  it("aceita um reel demandado completo", () => {
    expect(
      demandCycleViolations({
        status: DemandStatus.DEMANDED,
        boardColumn: "available",
        title: "Reels — rotina",
        demandType: "REEL",
        description: "Hook 3s, CTA no final.",
        format: "9:16",
        orientation: "vertical",
        durationSeconds: 30,
        sectorId: "video",
        briefingLockedAt: new Date(),
      })
    ).toEqual([]);
  });
});
