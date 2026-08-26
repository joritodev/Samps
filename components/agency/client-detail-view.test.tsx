// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClientDetail } from "@/types/clients-ui";
import { ClientDetailView } from "./client-detail-view";

vi.mock("@/app/actions/clients", () => ({
  syncClientContractServices: vi.fn(),
  updateClientProfile: vi.fn(),
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

function detail(active: boolean): ClientDetail {
  return {
    id: "c1",
    name: "Clínica Sorriso",
    logoUrl: null,
    active,
    segment: "Odontologia",
    planName: "Essencial",
    birthDate: null,
    addressZip: null,
    addressStreet: null,
    addressNumber: null,
    addressComplement: null,
    addressDistrict: null,
    addressCity: null,
    addressState: null,
    contractDocUrl: null,
    studyDocUrl: null,
    contractServices: [],
    createdAt: "2024-01-15T00:00:00.000Z",
    openDemands: 2,
    totalDemands: 10,
    publishedDemands: 3,
    hasBoard: true,
    team: [],
    demands: [],
  };
}

describe("ClientDetailView status badge", () => {
  it("uses semantic status tokens at text-xs, not emerald or amber", () => {
    const { rerender } = render(
      <ClientDetailView
        client={detail(true)}
        contentTypes={[]}
        canViewAsClient={false}
        canCreateBoard={false}
        canEditContract={false}
      />
    );

    const active = screen.getByText("Ativo");
    expect(active.className).toMatch(/text-xs/);
    expect(active.className).toMatch(/success/);
    expect(active.className).not.toMatch(RAINBOW);

    rerender(
      <ClientDetailView
        client={detail(false)}
        contentTypes={[]}
        canViewAsClient={false}
        canCreateBoard={false}
        canEditContract={false}
      />
    );

    const paused = screen.getByText("Pausado");
    expect(paused.className).toMatch(/text-xs/);
    expect(paused.className).toMatch(/warning/);
    expect(paused.className).not.toMatch(RAINBOW);
    expect(paused.className).not.toMatch(/text-\[10px\]/);
  });
});
