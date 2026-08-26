// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalPage } from "./portal-page";

afterEach(() => {
  cleanup();
});

describe("PortalPage", () => {
  it("renders a display heading smaller than agency text-3xl", () => {
    render(
      <PortalPage title="Olá, Cliente">
        <p>Conteúdo</p>
      </PortalPage>
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Olá, Cliente" });
    expect(heading.className).toMatch(/font-display/);
    expect(heading.className).toMatch(/text-2xl/);
    expect(heading.className).not.toMatch(/text-3xl/);
  });

  it("shows an optional description and constrains width", () => {
    const { container } = render(
      <PortalPage title="Portal" description="Visão geral do seu conteúdo">
        <p>Conteúdo</p>
      </PortalPage>
    );

    expect(screen.getByText("Visão geral do seu conteúdo")).toBeTruthy();
    expect(container.firstElementChild?.className).toMatch(/mx-auto/);
    expect(container.firstElementChild?.className).toMatch(/max-w-5xl/);
    expect(container.firstElementChild?.className).toMatch(/space-y-8/);
  });
});
