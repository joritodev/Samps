// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MuralPopover } from "./mural-popover";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("MuralPopover", () => {
  it("abre o mural com título do aviso e botão Dispensar", async () => {
    render(
      <MuralPopover
        announcements={[
          {
            id: "a1",
            title: "Reunião geral",
            message: "Hoje às 16h",
            kind: "INFO",
          },
        ]}
        birthdays={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Mural/ }));

    expect(await screen.findByText("Reunião geral")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dispensar" })).toBeTruthy();
    expect(screen.getByText("Avisos gerais")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
