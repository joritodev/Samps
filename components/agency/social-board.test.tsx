// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialBoard } from "./social-board";

vi.mock("@/app/actions/social", () => ({
  publicarDemanda: vi.fn(),
}));

vi.mock("@/components/agency/demand-card", () => ({
  DemandCard: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("SocialBoard empty columns", () => {
  it("shows BoardColumnEmpty copy without drag when a column has no cards", () => {
    render(
      <SocialBoard
        columns={[{ id: "awaiting_publish", title: "Aguardando", cards: [] }]}
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
