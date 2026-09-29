// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MetricCard } from "./metric-card";

afterEach(() => {
  cleanup();
});

function dotOf(label: string) {
  return screen
    .getByText(label)
    .querySelector('[data-slot="metric-dot"]') as HTMLElement;
}

describe("MetricCard", () => {
  it("renders the label and value", () => {
    render(<MetricCard label="Em aberto" value={12} />);

    expect(screen.getByText("Em aberto")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("uses text-xs on the label and a dot only for alert tones", () => {
    const { rerender } = render(
      <MetricCard label="Produção" value={4} tone="success" />
    );

    expect(screen.getByText("Produção").className).toMatch(/text-xs/);
    expect(dotOf("Produção")).toBeNull();

    rerender(<MetricCard label="Ajustes" value={1} tone="warning" />);
    expect(dotOf("Ajustes").className).toMatch(/bg-warning/);

    rerender(<MetricCard label="Atrasadas" value={2} tone="danger" />);
    expect(dotOf("Atrasadas").className).toMatch(/bg-destructive/);
    expect(dotOf("Atrasadas").className).not.toMatch(/emerald|amber|violet/);
  });

  it("colors the value only for alert tones", () => {
    const { rerender } = render(
      <MetricCard label="Atrasadas" value={2} tone="danger" />
    );
    expect(screen.getByText("2").className).toMatch(/text-destructive/);

    rerender(<MetricCard label="Em aberto" value={12} tone="primary" />);
    expect(screen.getByText("12").className).toMatch(/text-foreground/);

    rerender(<MetricCard label="Hoje" value={1} />);
    expect(screen.getByText("1").className).toMatch(/text-foreground/);
  });

  it("drops the frame in the plain variant", () => {
    render(<MetricCard label="Hoje" value={1} variant="plain" />);
    expect(screen.getByText("Hoje").parentElement?.className).not.toMatch(
      /border/
    );
  });
});
