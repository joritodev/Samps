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

  it("tints the value with the matching semantic tone", () => {
    const { rerender } = render(
      <MetricCard label="Atrasadas" value={2} tone="danger" />
    );
    expect(screen.getByText("2").className).toMatch(/text-destructive/);

    rerender(<MetricCard label="Em aberto" value={12} tone="primary" />);
    expect(screen.getByText("12").className).toMatch(/text-primary/);

    rerender(<MetricCard label="Produção" value={4} tone="success" />);
    expect(screen.getByText("4").className).toMatch(/text-success/);

    rerender(<MetricCard label="Hoje" value={1} />);
    expect(screen.getByText("1").className).toMatch(/text-foreground/);
  });
});
