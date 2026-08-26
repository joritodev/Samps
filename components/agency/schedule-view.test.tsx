// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScheduleView } from "./schedule-view";

afterEach(() => {
  cleanup();
});

describe("ScheduleView typography", () => {
  it("uses a paper page header, not Card chrome", () => {
    render(
      <ScheduleView
        title="Projetos"
        description="Lista de projetos"
        dateLabel="Prazo"
        emptyMessage="Nenhum projeto"
        items={[]}
      />
    );

    const header = screen.getByRole("heading", { name: "Projetos" }).closest(
      "header"
    );
    expect(header?.className).toMatch(/bg-background/);
    expect(header?.className).not.toMatch(/bg-card/);
  });
});
