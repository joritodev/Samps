// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MetricCard } from "./metric-card";

afterEach(() => {
  cleanup();
});

describe("MetricCard", () => {
  it("renders the label and value", () => {
    render(<MetricCard label="Em aberto" value={12} />);

    expect(screen.getByText("Em aberto")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("uses text-xs on the label and token tone classes", () => {
    const { rerender } = render(
      <MetricCard label="Produção" value={4} tone="success" />
    );

    expect(screen.getByText("Produção").className).toMatch(/text-xs/);
    expect(screen.getByText("Produção").parentElement?.className).toMatch(
      /border-success/
    );

    rerender(<MetricCard label="Atrasadas" value={2} tone="danger" />);
    expect(screen.getByText("Atrasadas").parentElement?.className).toMatch(
      /border-destructive/
    );
    expect(screen.getByText("Atrasadas").parentElement?.className).not.toMatch(
      /emerald|amber|violet/
    );
  });
});
