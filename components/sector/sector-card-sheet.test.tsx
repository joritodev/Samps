// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectorCardSheet } from "./sector-card-sheet";

vi.mock("@/lib/actions/assignment.actions", () => ({
  claimDemandAction: vi.fn(),
  assignDemandAction: vi.fn(),
  setScheduledExecutionAction: vi.fn(),
}));

vi.mock("@/lib/actions/work-session.actions", () => ({
  startWorkSessionAction: vi.fn(),
  pauseWorkSessionAction: vi.fn(),
  resumeWorkSessionAction: vi.fn(),
  completeProductionSectorAction: vi.fn(),
}));

vi.mock("@/lib/actions/adjustment.actions", () => ({
  requestAdjustmentAction: vi.fn(),
}));

vi.mock("@/lib/actions/cards.actions", () => ({
  registerPublicationAction: vi.fn(),
}));

vi.mock("@/app/actions/review", () => ({
  aprovarDemanda: vi.fn(),
}));

vi.mock("@/lib/actions/deadline.actions", () => ({
  listDemandDelaysAction: vi.fn(async () => []),
}));

vi.mock("@/app/actions/checklist", () => ({
  completeChecklistItemAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("SectorCardSheet checklist", () => {
  it("item demandado com responsável sugerido fica em Disponíveis (Assumir, sem iniciar produção)", () => {
    render(
      <SectorCardSheet
        open
        onOpenChange={() => undefined}
        currentUserId="traf-1"
        canAssign={false}
        sectorUsers={[{ id: "traf-1", name: "Rafael Alves" }]}
        card={{
          id: "child-1",
          title: "Criar conjunto de anúncios",
          status: "DEMANDED",
          clientId: "cli-1",
          isChecklistItem: true,
          parentDemand: { title: "Campanha Meta" },
          assignee: { id: "traf-1", name: "Rafael Alves" },
          assignments: [{ status: "AVAILABLE", executorId: null }],
        }}
      />
    );

    expect(screen.getByRole("button", { name: "Assumir demanda" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Iniciar produção" })).toBeNull();
    expect(screen.getByText("Parte de: Campanha Meta")).toBeTruthy();
  });

  it("líder conclui o item do checklist e atualiza a demanda", () => {
    render(
      <SectorCardSheet
        open
        onOpenChange={() => undefined}
        currentUserId="leader-1"
        canAssign
        sectorUsers={[{ id: "traf-1", name: "Rafael Alves" }]}
        card={{
          id: "child-1",
          title: "Criar conjunto de anúncios",
          status: "DEMANDED",
          clientId: "cli-1",
          isChecklistItem: true,
          parentDemand: { title: "Campanha Meta" },
          assignee: { id: "traf-1", name: "Rafael Alves" },
          assignments: [{ status: "AVAILABLE", executorId: null }],
        }}
      />
    );

    expect(
      screen.getByRole("button", { name: "Concluir demanda" })
    ).toBeTruthy();
  });
});
