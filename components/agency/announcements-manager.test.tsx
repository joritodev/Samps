// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncementsManager } from "./announcements-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/actions/announcements", () => ({
  createAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
  toggleAnnouncement: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("AnnouncementsManager", () => {
  it("mostra copy de publicação, avisos gerais e destaque no mural", () => {
    render(<AnnouncementsManager initialItems={[]} />);

    expect(screen.getByText(/Publicar agora/)).toBeTruthy();
    expect(screen.getByText(/Avisos gerais/)).toBeTruthy();
    expect(
      screen.getByText(/destaque no mural; não é um erro do sistema/)
    ).toBeTruthy();
  });
});
