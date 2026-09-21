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
  completeChecklistItemAction: vi.fn(),
  createChecklistAction: vi.fn(),
  setChecklistItemDueDateAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("DemandChecklist", () => {
  it("cria item com os mesmos campos de uma demanda (descrição, formato, prazo)", () => {
    render(
      <DemandChecklist
        parentId="parent-1"
        clientId="cli-1"
        items={[]}
        canEdit
        assignees={[{ id: "traf-1", name: "Rafael Alves", sectorId: "sec-traf" }]}
      />
    );

    expect(screen.getByLabelText("Título")).toBeTruthy();
    expect(screen.getByLabelText("Descrição")).toBeTruthy();
    expect(screen.getByLabelText("Formato")).toBeTruthy();
    expect(screen.getByLabelText("Prazo")).toBeTruthy();
    expect(
      screen.getByText(/Disponíveis no Meu painel do setor/i)
    ).toBeTruthy();
  });

  it("mostra descrição, prazo e concluir no item demandado", () => {
    render(
      <DemandChecklist
        parentId="parent-1"
        clientId="cli-1"
        canEdit
        items={[
          {
            id: "child-1",
            title: "Criar conjunto de anúncios",
            description: "Variações Meta Ads 1:1 e 9:16",
            format: "Feed",
            status: "DEMANDED",
            dueDate: "2026-09-20",
            assignee: { id: "traf-1", name: "Rafael Alves" },
          },
        ]}
        onOpenItem={() => undefined}
      />
    );

    expect(screen.getByText("Criar conjunto de anúncios")).toBeTruthy();
    expect(screen.getByText("Variações Meta Ads 1:1 e 9:16")).toBeTruthy();
    expect(screen.getByText(/Prazo:/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Concluir" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir" })).toBeTruthy();
  });
});
