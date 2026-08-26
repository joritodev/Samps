// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeamView, type TeamInvite, type TeamMember } from "./team-view";

vi.mock("@/app/actions/absences", () => ({
  cancelAbsence: vi.fn(),
}));

vi.mock("@/lib/actions/invites.actions", () => ({
  inviteUser: vi.fn(),
  resendInvite: vi.fn(),
  revokeInvite: vi.fn(),
}));

vi.mock("@/components/agency/absence-sheet", () => ({
  AbsenceSheet: () => null,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

afterEach(() => {
  cleanup();
});

const RAINBOW = /emerald-|amber-|rose-|fuchsia-|sky-|violet-/;

const member: TeamMember = {
  id: "u1",
  name: "Ana Souza",
  email: "ana@samps.test",
  userType: "DESIGNER",
  roleName: "Design",
  sectorName: "Social",
  status: "active",
  absenceToday: {
    id: "a1",
    kind: "VACATION",
    kindLabel: "Férias",
    rangeLabel: "01/08 – 10/08",
  },
};

function invite(
  overrides: Partial<TeamInvite> & Pick<TeamInvite, "id" | "state">
): TeamInvite {
  return {
    email: `${overrides.state}@samps.test`,
    invitedByName: "Gestão",
    createdAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:00:00.000Z",
    acceptedAt: null,
    ...overrides,
  };
}

function renderTeam(
  overrides: Partial<ComponentProps<typeof TeamView>> = {}
) {
  return render(
    <TeamView
      members={[member]}
      invites={[
        invite({ id: "i-valid", state: "valid" }),
        invite({ id: "i-expired", state: "expired" }),
        invite({ id: "i-revoked", state: "revoked" }),
      ]}
      absences={[
        {
          id: "a1",
          userId: "u1",
          userName: "Ana Souza",
          kindLabel: "Férias",
          rangeLabel: "01/08 – 10/08",
          note: null,
          canCancel: false,
        },
      ]}
      roles={[]}
      sectors={[]}
      userTypes={["DESIGNER"]}
      currentUserId="me"
      canInvite
      canRevoke
      canManageAbsences
      {...overrides}
    />
  );
}

describe("TeamView tokens", () => {
  it("renders the page header on paper, not Card chrome", () => {
    renderTeam();

    const header = screen.getByRole("heading", { name: "Equipe" }).closest(
      "header"
    );
    expect(header?.className).toMatch(/bg-background/);
    expect(header?.className).not.toMatch(/bg-card/);
  });

  it("uses semantic badges for absence and invite state, not rainbow palettes", () => {
    const { container } = renderTeam();

    const absence = screen.getByText(/Férias/);
    expect(absence.className).toMatch(/text-xs/);
    expect(absence.className).toMatch(/destructive/);
    expect(absence.className).not.toMatch(RAINBOW);

    const convitesTab = screen.getByRole("tab", { name: /Convites/ });
    fireEvent.mouseDown(convitesTab, { button: 0, ctrlKey: false });

    const waiting = screen.getByText("Aguardando aceite");
    expect(waiting.className).toMatch(/text-xs/);
    expect(waiting.className).toMatch(/primary/);

    const expired = screen.getByText("Expirado");
    expect(expired.className).toMatch(/warning/);

    const revoked = screen.getByText("Revogado");
    expect(revoked.className).toMatch(/secondary|muted/);

    expect(container.innerHTML).not.toMatch(RAINBOW);
    expect(container.innerHTML).not.toMatch(/text-\[10px\]/);
  });
});
