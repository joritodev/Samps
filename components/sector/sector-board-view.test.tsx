// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectorBoardView } from "./sector-board-view";

vi.mock("@/components/sector/sector-card-sheet", () => ({
  SectorCardSheet: () => null,
}));

afterEach(() => {
  cleanup();
});

const kpis = {
  priorityCount: 0,
  available: 0,
  inProduction: 0,
  doneToday: 0,
  doneWeek: 0,
  doneMonth: 0,
  overdue: 0,
  unassigned: 0,
  inReview: 0,
  adjustments: 0,
};

describe("SectorBoardView kanban empty columns", () => {
  it("shows BoardColumnEmpty copy when a kanban column has no cards", () => {
    render(
      <SectorBoardView
        title="Social"
        description="Quadro do setor"
        columns={[{ id: "open", title: "Abertas" }]}
        grouped={{ open: [] }}
        top5={[]}
        kpis={kpis}
        calendarDemands={[]}
        currentUserId="u1"
        canAssign={false}
        sectorUsers={[]}
      />
    );

    expect(screen.getByText("Nenhum cartão nesta coluna")).toBeTruthy();
    expect(
      screen.getByText("Arraste uma demanda para cá ou crie um cartão.")
    ).toBeTruthy();
  });
});
