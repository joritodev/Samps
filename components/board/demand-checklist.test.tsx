// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemandChecklist } from "./demand-checklist";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/actions/checklist", () => ({
  addChecklistItemAction: vi.fn(),
  assignChecklistItemAction: vi.fn(),
  createChecklistAction: vi.fn(),
  deleteChecklistAction: vi.fn(),
  deleteChecklistItemAction: vi.fn(),
  renameChecklistAction: vi.fn(),
  reorderChecklistItemsAction: vi.fn(),
  setChecklistItemDueDateAction: vi.fn(),
  openChecklistItemAction: vi.fn(),
  toggleChecklistItemDoneAction: vi.fn(),
  unassignChecklistItemAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("DemandChecklist", () => {
  it("mostra checkbox + Adicionar um item e não mostra Descrição", () => {
    render(
      <DemandChecklist
        demandId="parent-1"
        clientId="cli-1"
        canEdit
        checklists={[
          {
            id: "cl-1",
            title: "Checklist",
            sortOrder: 0,
            items: [
              {
                id: "item-1",
                title: "Item leve",
                isDone: false,
                sortOrder: 0,
              },
            ],
          },
        ]}
        assignees={[
          { id: "traf-1", name: "Rafael Alves", sectorId: "sec-traf" },
        ]}
      />
    );

    expect(screen.getByRole("checkbox")).toBeTruthy();
    expect(screen.getByPlaceholderText("Adicionar um item")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adicionar item" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Atribuir responsável" })
    ).toBeTruthy();
    expect(screen.queryByLabelText("Descrição")).toBeNull();
    expect(screen.getByRole("button", { name: /Adicionar checklist/i })).toBeTruthy();
  });

  it("mostra Abrir quando há linkedDemandId e não mostra Concluir", () => {
    render(
      <DemandChecklist
        demandId="parent-1"
        clientId="cli-1"
        canEdit
        checklists={[
          {
            id: "cl-1",
            title: "Checklist",
            sortOrder: 0,
            items: [
              {
                id: "item-1",
                title: "Criar conjunto de anúncios",
                isDone: false,
                sortOrder: 0,
                dueDate: "2026-09-20",
                assignee: { id: "traf-1", name: "Rafael Alves" },
                linkedDemandId: "child-1",
              },
            ],
          },
        ]}
        assignees={[
          { id: "traf-1", name: "Rafael Alves", sectorId: "sec-traf" },
        ]}
        onOpenLinkedDemand={() => undefined}
      />
    );

    expect(
      screen.getByRole("button", { name: "Criar conjunto de anúncios" })
    ).toBeTruthy();
    expect(screen.getByRole("checkbox")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Abrir" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Concluir" })).toBeNull();
    expect(screen.queryByLabelText("Descrição")).toBeNull();
  });
});
