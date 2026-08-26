// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/types/auth";

vi.mock("next/navigation", () => ({
  usePathname: () => "/portal",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: vi.fn().mockResolvedValue(undefined) }),
  signOut: vi.fn(),
}));

import { PortalSidebar } from "./portal-sidebar";

afterEach(() => {
  cleanup();
});

function user(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u1",
    email: "ana@samps.test",
    name: "Ana Souza",
    userType: "ADMIN",
    roleId: "r1",
    roleName: "Admin",
    status: "ACTIVE",
    mustResetPassword: false,
    permissions: [],
    clientIds: [],
    ...overrides,
  };
}

describe("PortalSidebar", () => {
  it("shows Samps mark and a mobile menu trigger", () => {
    render(
      <PortalSidebar
        user={user()}
        clientName="Cliente Demo"
        isPreview={false}
      />
    );

    expect(screen.getAllByTitle("Samps Digital").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Abrir menu" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Cliente Demo" }).length).toBeGreaterThan(0);
  });

  it("gives nav links more breathing room", () => {
    render(
      <PortalSidebar
        user={user()}
        clientName="Cliente Demo"
        isPreview={false}
      />
    );

    const overview = screen.getAllByRole("link", { name: "Visão geral" })[0];
    expect(overview.className).toMatch(/py-2\.5/);
  });

  it("shows preview exit above Sair only in preview mode", () => {
    const { rerender } = render(
      <PortalSidebar
        user={user({ userType: "EXTERNAL_CLIENT" })}
        clientName="Cliente Demo"
        isPreview={false}
      />
    );

    expect(screen.queryByRole("button", { name: "Sair da visualização" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Sair" }).length).toBeGreaterThan(0);

    rerender(
      <PortalSidebar
        user={user()}
        clientName="Cliente Demo"
        isPreview
      />
    );

    const exits = screen.getAllByRole("button", { name: "Sair da visualização" });
    expect(exits.length).toBeGreaterThan(0);
  });
});
