// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockUpdate, mockPush } = vi.hoisted(() => ({
  mockUpdate: vi.fn().mockResolvedValue(undefined),
  mockPush: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: mockUpdate }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { PortalPreviewExit } from "./portal-preview-exit";

afterEach(() => {
  cleanup();
  mockUpdate.mockClear();
  mockPush.mockClear();
});

describe("PortalPreviewExit", () => {
  it("clears impersonation and returns to clientes", async () => {
    render(<PortalPreviewExit />);

    fireEvent.click(
      screen.getByRole("button", { name: "Sair da visualização" })
    );

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ impersonatingClientId: null });
    });
    expect(mockPush).toHaveBeenCalledWith("/clientes");
  });
});
