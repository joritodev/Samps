// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsHub } from "./settings-hub";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

function renderHub(permissions: string[] = ["settings.access"]) {
  return render(<SettingsHub permissions={permissions} />);
}

describe("SettingsHub flatten", () => {
  it("renders the header on paper with a border, not Card chrome", () => {
    renderHub();

    const header = screen
      .getByRole("heading", { name: "Configurações" })
      .closest("header");
    expect(header?.className).toMatch(/bg-background/);
    expect(header?.className).toMatch(/border-b/);
    expect(header?.className).not.toMatch(/bg-card/);
    expect(
      screen.getByText("Preferências pessoais e parâmetros do sistema")
    ).toBeTruthy();
  });

  it("flattens the grid and tiles: no muted wash, no shadow stack, cyan icon well", () => {
    const { container } = renderHub();

    const grid = container.querySelector(".grid");
    expect(grid?.className).toMatch(/bg-background/);
    expect(grid?.className).not.toMatch(/bg-muted\/30/);

    const tile = screen.getByRole("link", {
      name: /Aparência.*Modo claro ou escuro/,
    });
    expect(tile.className).toMatch(/border-border/);
    expect(tile.className).toMatch(/bg-card/);
    expect(tile.className).not.toMatch(/shadow-sm|shadow-md/);
    expect(tile.className).toMatch(/hover:bg-muted\/40|hover:border-primary\/40/);

    const iconWell = tile.querySelector("div");
    expect(iconWell?.className).toMatch(/bg-primary\/10/);
    expect(iconWell?.className).toMatch(/text-primary/);
    expect(iconWell?.className).not.toMatch(/bg-secondary/);
  });

  it("keeps copy and permission filtering intact", () => {
    renderHub([]);

    expect(
      screen.getByRole("link", { name: /Aparência.*Modo claro ou escuro/ })
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Notificações/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Empresa/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Funções/ })).toBeNull();
  });
});
