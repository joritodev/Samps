// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MuralPopover } from "./mural-popover";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const info = { id: "a1", title: "Reunião geral", message: "Hoje às 16h", kind: "INFO" as const, authorName: "Rafael Admin" };
const urgent = { id: "a2", title: "Sistema fora do ar", message: "Às 22h", kind: "URGENT" as const };

function open() {
  fireEvent.click(screen.getByRole("button", { name: /^Avisos/ }));
}

describe("MuralPopover (Avisos)", () => {
  it("abre com título, grupos e botão Dispensar", async () => {
    render(<MuralPopover announcements={[info, urgent]} birthdays={[]} />);
    open();

    expect(await screen.findByText("Reunião geral")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Urgente" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Comunicados" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Dispensar" }).length).toBe(2);
    expect(screen.getByText(/Rafael Admin/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("selo do megafone vira urgente quando há aviso urgente novo", () => {
    const { rerender } = render(<MuralPopover announcements={[info]} birthdays={[]} />);
    expect(screen.getByRole("button", { name: "Avisos, 1 novos" }).querySelector("[data-urgent]")?.getAttribute("data-urgent")).toBe("false");
    rerender(<MuralPopover announcements={[info, urgent]} birthdays={[]} />);
    expect(screen.getByRole("button", { name: "Avisos, 2 novos" }).querySelector("[data-urgent]")?.getAttribute("data-urgent")).toBe("true");
  });

  it("dispensar move para Vistos (não apaga) e dá para voltar a Novo", async () => {
    render(<MuralPopover announcements={[info]} birthdays={[]} />);
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Dispensar" }));
    expect(screen.getByText("Nenhum aviso novo.")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem("samps:avisos-vistos")!)).toContain("announcement:a1");

    fireEvent.click(screen.getByRole("tab", { name: /Vistos/ }));
    expect(screen.getByText("Reunião geral")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como novo" }));
    fireEvent.click(screen.getByRole("tab", { name: /Novos/ }));
    expect(screen.getByText("Reunião geral")).toBeTruthy();
  });

  it("aniversário mostra a idade e dispensar todos esvazia os novos", async () => {
    render(
      <MuralPopover
        announcements={[info]}
        birthdays={[{ id: "u1", name: "Maria Souza", kindOf: "user", age: 28 }]}
      />
    );
    open();
    expect(await screen.findByText("Maria Souza faz 28 anos hoje")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dispensar todos" }));
    expect(screen.getByText("Nenhum aviso novo.")).toBeTruthy();
  });

  it("tem o botão de som dentro da janela", async () => {
    render(<MuralPopover announcements={[info]} birthdays={[]} />);
    open();
    expect(await screen.findByRole("button", { name: /Silenciar avisos|Ativar som/ })).toBeTruthy();
  });
});
