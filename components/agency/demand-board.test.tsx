// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemandBoard } from "./demand-board";

vi.mock("@/app/actions/demand", () => ({
  concluirBriefing: vi.fn(),
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
      screen.getByText("Arraste uma demanda para cá ou crie um cartão.")
    ).toBeTruthy();
  });
});
