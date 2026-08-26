// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalEmpty } from "./portal-empty";

afterEach(() => {
  cleanup();
});

describe("PortalEmpty", () => {
  it("shows a title and a description with a verb", () => {
    render(
      <PortalEmpty
        title="Nenhum evento no calendário"
        description="Entregas e publicações com data aparecem aqui."
      />
    );

    expect(screen.getByText("Nenhum evento no calendário")).toBeTruthy();
    expect(screen.getByText(/aparecem/i)).toBeTruthy();
  });

  it("uses a light surface without shadow", () => {
    const { container } = render(
      <PortalEmpty
        title="Nenhum arquivo disponível"
        description="Arquivos compartilhados com você aparecem aqui."
      />
    );

    const surface = container.firstElementChild;
    expect(surface?.className).toMatch(/rounded-xl/);
    expect(surface?.className).toMatch(/border-border\/60/);
    expect(surface?.className).toMatch(/bg-card\/50/);
    expect(surface?.className).not.toMatch(/shadow-sm/);
    expect(surface?.className).not.toMatch(/shadow-soft/);
  });
});
