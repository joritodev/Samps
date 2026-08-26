// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Clock } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalStat } from "./portal-stat";

afterEach(() => {
  cleanup();
});

describe("PortalStat", () => {
  it("renders a xs label and tabular value without agency shadow", () => {
    const { container } = render(
      <PortalStat label="Planejadas" value={12} />
    );

    const label = screen.getByText("Planejadas");
    const value = screen.getByText("12");

    expect(label.className).toMatch(/text-xs/);
    expect(value.className).toMatch(/tabular-nums/);
    expect(container.firstElementChild?.className).toMatch(/border/);
    expect(container.firstElementChild?.className).not.toMatch(/shadow-soft/);
    expect(container.firstElementChild?.className).not.toMatch(/shadow-sm/);
  });

  it("marks an optional icon as decorative", () => {
    const { container } = render(
      <PortalStat label="Em produção" value={4} icon={Clock} />
    );

    const icon = container.querySelector("svg");
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });
});
