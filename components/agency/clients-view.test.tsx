// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientListItem } from "@/types/clients-ui";
import { ClientsView } from "./clients-view";

vi.mock("@/app/actions/clients", () => ({
  createClient: vi.fn(),
}));

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

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

const RAINBOW = /emerald-|amber-|rose-|fuchsia-|sky-|violet-/;

const clients: ClientListItem[] = [
  {
    id: "c1",
    name: "Clínica Sorriso",
    logoUrl: null,
    active: true,
    openDemands: 3,
    hasBoard: true,
    team: [{ id: "u1", name: "Ana", role: "Design" }],
  },
  {
    id: "c2",
    name: "Padaria Luz",
    logoUrl: null,
    active: false,
    openDemands: 0,
    hasBoard: false,
    team: [],
  },
];

describe("ClientsView tokens", () => {
  it("renders the page header on paper, not Card chrome", () => {
    render(
      <ClientsView clients={clients} canCreate contentTypes={[]} />
    );

    const header = screen.getByRole("heading", { name: "Clientes" }).closest(
      "header"
    );
    expect(header?.className).toMatch(/bg-background/);
    expect(header?.className).not.toMatch(/bg-card/);
  });

  it("uses semantic status pills at text-xs, not rainbow palettes", () => {
    const { container } = render(
      <ClientsView clients={clients} canCreate contentTypes={[]} />
    );

    const active = screen.getByText("Ativo");
    expect(active.className).toMatch(/text-xs/);
    expect(active.className).toMatch(/success/);

    const paused = screen.getByText("Pausado");
    expect(paused.className).toMatch(/text-xs/);
    expect(paused.className).toMatch(/warning/);

    expect(container.innerHTML).not.toMatch(RAINBOW);
    expect(container.innerHTML).not.toMatch(/text-\[10px\]/);
  });
});
