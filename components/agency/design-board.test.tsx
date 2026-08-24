// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignBoard } from "./design-board";

vi.mock("@/app/actions/designer", () => ({
  assumirDemanda: vi.fn(),
  concluirProducao: vi.fn(),
}));

vi.mock("@/app/actions/review", () => ({
  aprovarDemanda: vi.fn(),
  solicitarAjuste: vi.fn(),
}));

vi.mock("@/components/agency/demand-card", () => ({
  DemandCard: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("DesignBoard empty columns", () => {
  it("shows BoardColumnEmpty copy without drag when a column has no cards", () => {
    render(
      <DesignBoard
        sectorName="Design"
        columns={[{ id: "available", title: "Disponíveis", cards: [] }]}
      />
    );

    expect(screen.getByText("Nenhum cartão nesta coluna")).toBeTruthy();
    expect(
      screen.getByText("Aguarde novas demandas nesta etapa.")
    ).toBeTruthy();
    expect(screen.queryByText("Nenhum cartão")).toBeNull();
    expect(
      screen.queryByText("Arraste uma demanda para cá ou crie um cartão.")
    ).toBeNull();
  });
});
