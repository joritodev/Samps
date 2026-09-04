// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemandBoard } from "./demand-board";

vi.mock("@/app/actions/demand", () => ({
  concluirBriefing: vi.fn(),
}));

vi.mock("@/app/actions/create-demand", () => ({
  createDemandAction: vi.fn(),
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
});
