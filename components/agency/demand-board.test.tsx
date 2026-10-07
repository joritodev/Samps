// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadOperationalCardAction } from "@/lib/actions/operational-card.actions";
import { DemandBoard } from "./demand-board";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/demandas",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/actions/demand", () => ({
  concluirBriefing: vi.fn(),
}));

vi.mock("@/app/actions/create-demand", () => ({
  createDemandAction: vi.fn(),
}));

vi.mock("@/lib/actions/operational-card.actions", () => ({
  loadOperationalCardAction: vi.fn(),
}));

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

vi.mock("@/app/actions/checklist", () => ({
  completeChecklistItemAction: vi.fn(),
}));

vi.mock("@/lib/actions/deadline.actions", () => ({
  listDemandDelaysAction: vi.fn().mockResolvedValue([]),
  changeDemandDeadlineAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("DemandBoard empty columns", () => {
  it("shows BoardColumnEmpty copy when a column has no cards", () => {
    render(
      <DemandBoard
        title="Demandas"
        subtitle="Quadro da agência"
        columns={[{ id: "open", title: "Abertas", cards: [] }]}
        taxonomy={{ sectors: [], priorities: [] }}
      />
    );

    expect(screen.getByText("Nenhum cartão nesta coluna")).toBeTruthy();
    expect(
      screen.getByText("Crie uma demanda ou aguarde novas atribuições.")
    ).toBeTruthy();
    expect(
      screen.queryByText("Arraste uma demanda para cá ou crie um cartão.")
    ).toBeNull();
  });

  it("mostra botão Nova Demanda quando canCreate", () => {
    render(
      <DemandBoard
        title="Demandas"
        subtitle="Quadro"
        columns={[{ id: "open", title: "Abertas", cards: [] }]}
        taxonomy={{ sectors: [], priorities: [] }}
        canCreate
        clients={[{ id: "c1", name: "Cliente Demo" }]}
      />
    );

    expect(screen.getByRole("button", { name: /Nova Demanda/i })).toBeTruthy();
  });

  it("abre o mesmo painel operacional numa demanda publicada", async () => {
    vi.mocked(loadOperationalCardAction).mockResolvedValue({
      card: {
        id: "d1",
        title: "Feed publicado",
        status: "PUBLISHED",
        clientId: "c1",
        client: { name: "Clínica" },
        assignee: { id: "u1", name: "Helena" },
        assignments: [
          {
            status: "DONE",
            executorId: "u1",
            executor: { id: "u1", name: "Helena" },
          },
        ],
      },
      sectorUsers: [],
    });

    render(
      <DemandBoard
        title="Demandas"
        subtitle="Quadro"
        currentUserId="u1"
        canAssign
        canReview
        columns={[
          {
            id: "done",
            title: "Concluídas",
            cards: [
              {
                id: "d1",
                title: "Feed publicado",
                description: null,
                status: "PUBLISHED",
                priority: "Alta",
                sector: "Design",
                dueDate: null,
                materialUrl: null,
                publishedUrl: "https://example.com/feed",
                briefingLockedAt: "2026-10-07T00:00:00.000Z",
                clientName: "Clínica",
                clientId: "c1",
              },
            ],
          },
        ]}
        taxonomy={{ sectors: [], priorities: [] }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Feed publicado/ }));

    expect(await screen.findByText(/Demanda finalizada/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Atribuir" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Iniciar produção" })).toBeNull();
  });
});
