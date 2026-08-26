// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemandCard } from "./demand-card";
import type { BoardDemand } from "@/types/board-ui";

vi.mock("@/app/actions/demand", () => ({
  concluirBriefing: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const demand: BoardDemand = {
  id: "1",
  title: "Campanha X",
  description: null,
  status: "OPEN",
  priority: "Alta",
  sector: "Social",
  dueDate: "2026-08-24T12:00:00.000Z",
  materialUrl: null,
  publishedUrl: null,
  briefingLockedAt: null,
  clientName: "Cliente Y",
};

describe("Agency DemandCard typography", () => {
  it("uses text-xs for client, badges and deadline", () => {
    render(<DemandCard demand={demand} onOpen={vi.fn()} />);

    expect(screen.getByText("Cliente Y").className).toMatch(/text-xs/);
    expect(screen.getByText("Social").className).toMatch(/text-xs/);
    expect(screen.getByText("Alta").className).toMatch(/text-xs/);
    const deadline = screen.getByText(/\d{2}\/\d{2}\/\d{4}/);
    expect(deadline.className).toMatch(/text-xs/);
  });
});
