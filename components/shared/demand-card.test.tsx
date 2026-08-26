// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemandCard } from "./demand-card";

afterEach(() => {
  cleanup();
});

const base = {
  id: "1",
  title: "Campanha X",
  type: "POST",
  status: "OPEN",
};

describe("DemandCard", () => {
  it("renders as a button when onClick is provided", () => {
    const onClick = vi.fn();
    render(<DemandCard demand={base} onClick={onClick} />);
    expect(screen.getByRole("button", { name: /Campanha X/i })).toBeTruthy();
  });

  it("does not render a button when onClick is omitted", () => {
    render(<DemandCard demand={base} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Campanha X")).toBeTruthy();
  });

  it("shows timer elapsed with tabular-nums class", () => {
    render(
      <DemandCard
        demand={{
          ...base,
          timerPreview: {
            status: "RUNNING",
            startedAt: new Date(),
            executor: { name: "Ana" },
            elapsedLabel: "15min",
          },
        }}
      />
    );
    const elapsed = screen.getByText("15min");
    expect(elapsed.className).toMatch(/tabular-nums/);
  });
});
