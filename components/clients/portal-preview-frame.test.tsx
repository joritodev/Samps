// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockStart, mockUpdate } = vi.hoisted(() => ({
  mockStart: vi.fn(),
  mockUpdate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: mockUpdate }),
}));

vi.mock("@/lib/actions/impersonate.actions", () => ({
  startImpersonation: mockStart,
}));

import { PortalPreviewFrame } from "./portal-preview-frame";

afterEach(() => {
  cleanup();
  mockStart.mockReset();
  mockUpdate.mockClear();
});

describe("PortalPreviewFrame", () => {
  it("shows permission errors with destructive token", async () => {
    mockStart.mockResolvedValue({ success: false });

    render(<PortalPreviewFrame clientId="c1" />);

    const error = await waitFor(() =>
      screen.getByText("Sem permissão para visualizar este cliente.")
    );

    expect(error.className).toMatch(/text-destructive/);
    expect(error.className).not.toMatch(/text-red-600/);
  });

  it("renders the preview iframe with token colors, not hardcoded white", async () => {
    mockStart.mockResolvedValue({ success: true, clientId: "c1" });

    render(<PortalPreviewFrame clientId="c1" />);

    const iframe = await waitFor(() => screen.getByTitle("Prévia do portal"));

    expect(iframe.className).toMatch(/bg-card/);
    expect(iframe.className).toMatch(/border-border\/60/);
    expect(iframe.className).not.toMatch(/bg-white/);
    expect(iframe.className).not.toMatch(/shadow-sm/);
  });
});
