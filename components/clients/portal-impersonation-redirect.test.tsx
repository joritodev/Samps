// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockStart, mockUpdate, mockReplace } = vi.hoisted(() => ({
  mockStart: vi.fn(),
  mockUpdate: vi.fn().mockResolvedValue(undefined),
  mockReplace: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: mockUpdate }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/actions/impersonate.actions", () => ({
  startImpersonation: mockStart,
}));

import { PortalImpersonationRedirect } from "./portal-impersonation-redirect";

afterEach(() => {
  cleanup();
  mockStart.mockReset();
  mockUpdate.mockClear();
  mockReplace.mockClear();
});

describe("PortalImpersonationRedirect", () => {
  it("shows permission errors with destructive token", async () => {
    mockStart.mockResolvedValue({ success: false });

    render(<PortalImpersonationRedirect clientId="c1" />);

    const error = await waitFor(() =>
      screen.getByText("Sem permissão para visualizar este cliente.")
    );

    expect(error.className).toMatch(/text-destructive/);
    expect(error.className).not.toMatch(/text-red-600/);
  });
});
