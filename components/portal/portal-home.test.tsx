// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalHome } from "./portal-home";

afterEach(() => {
  cleanup();
});

const stats = { planned: 3, inProgress: 2, published: 5 };

function demand(
  overrides: Partial<{
    id: string;
    title: string;
    status: string;
    externalStatus: string | null;
  }> = {}
) {
  return {
    id: "d1",
    title: "Campanha de lançamento",
    status: "Em produção",
    externalStatus: null as string | null,
    ...overrides,
  };
}

describe("PortalHome", () => {
  it("uses a display heading and three stats without Entregues", () => {
    render(
      <PortalHome
        clientName="Cliente Demo"
        stats={stats}
        demands={[demand()]}
      />
    );

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Olá, Cliente Demo",
    });
    expect(heading.className).toMatch(/font-display/);
    expect(heading.className).toMatch(/text-2xl/);
    expect(heading.className).not.toMatch(/text-3xl/);

    expect(screen.getByText("Planejadas")).toBeTruthy();
    expect(screen.getByText("Publicadas")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.queryByText("Entregues")).toBeNull();
  });

  it("does not render a duplicate preview banner", () => {
    const { container } = render(
      <PortalHome
        clientName="Cliente Demo"
        stats={stats}
        demands={[demand()]}
      />
    );

    expect(screen.queryByText(/simulação/i)).toBeNull();
    expect(screen.queryByText(/rascunho/i)).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("shows a friendly status on light recent rows", () => {
    render(
      <PortalHome
        clientName="Cliente Demo"
        stats={stats}
        demands={[
          demand({
            status: "IN_PRODUCTION",
            externalStatus: "Em produção",
          }),
        ]}
      />
    );

    const title = screen.getByText("Campanha de lançamento");
    const row = title.parentElement;
    expect(row?.className).toMatch(/rounded-lg/);
    expect(row?.className).toMatch(/border/);
    expect(row?.className).toMatch(/px-4/);
    expect(row?.className).toMatch(/py-3/);
    expect(screen.queryByText("IN_PRODUCTION")).toBeNull();
    expect(screen.getAllByText("Em produção").length).toBeGreaterThan(0);
  });

  it("empty state uses a verb and avoids heavy card shadow", () => {
    const { container } = render(
      <PortalHome clientName="Cliente Demo" stats={stats} demands={[]} />
    );

    expect(screen.queryByText("Nenhum conteúdo disponível.")).toBeNull();
    expect(container.textContent).toMatch(/aparecem/i);
    expect(container.innerHTML).not.toMatch(/shadow-sm/);
    expect(container.innerHTML).not.toMatch(/shadow-soft/);
  });
});
