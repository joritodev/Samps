// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgendaEvent, AgendaEventKind } from "@/lib/agency/agenda-events";
import { AgendaView } from "./agenda-view";

vi.mock("@/lib/actions/agenda-meeting.actions", () => ({
  createAgendaMeetingAction: vi.fn(),
  updateAgendaMeetingAction: vi.fn(),
  deleteAgendaMeetingAction: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

const RAINBOW = /emerald-|amber-|rose-|fuchsia-|sky-|violet-/;

function event(
  overrides: Partial<AgendaEvent> & Pick<AgendaEvent, "id" | "kind" | "title">
): AgendaEvent {
  return {
    demandId: "d1",
    clientId: "c1",
    clientName: "Cliente Y",
    sectorId: "s1",
    sectorSlug: "social",
    sectorName: "Social",
    date: new Date().toISOString(),
    status: "OPEN",
    assigneeName: null,
    ...overrides,
  };
}

const kinds: AgendaEventKind[] = [
  "due",
  "delivery",
  "publish",
  "birthday",
  "absence",
];

describe("AgendaView tokens", () => {
  it(
    "uses text-xs chips and semantic kind tokens, not rainbow palettes",
    () => {
    const { container } = render(
      <AgendaView
        events={kinds.map((kind) =>
          event({ id: `${kind}-1`, kind, title: `Evento ${kind}` })
        )}
      />
    );

    const dueChip = screen
      .getAllByText("Evento due")
      .find((el) => el.parentElement?.className.includes("truncate"))
      ?.parentElement;
    expect(dueChip?.className).toMatch(/text-xs/);
    expect(dueChip?.className).toMatch(/warning/);
    expect(dueChip?.className).not.toMatch(/text-\[10px\]/);

    const deliveryChip = screen
      .getAllByText("Evento delivery")
      .find((el) => el.parentElement?.className.includes("truncate"))
      ?.parentElement;
    expect(deliveryChip?.className).toMatch(/success/);
    expect(screen.getByText("Prazo · Social").className).toMatch(/warning/);
    expect(screen.getByText("Entrega · Social").className).toMatch(/success/);
    expect(screen.getByText("Publicação · Social").className).toMatch(/primary/);
    expect(screen.getByText("Aniversário · Social").className).toMatch(/brand/);
    expect(screen.getByText("Ausência · Social").className).toMatch(
      /destructive/
    );

    expect(container.innerHTML).not.toMatch(RAINBOW);
    expect(container.innerHTML).not.toMatch(/text-\[10px\]/);
    expect(screen.getByText(/\+\d+ mais/).className).toMatch(/text-xs/);
  },
    15_000
  );

  it("mostra nome, descrição, horário e link da reunião", () => {
    render(
      <AgendaView
        canManageMeetings
        events={[
          event({
            id: "meeting:m1",
            kind: "meeting",
            title: "Alinhamento semanal",
            description: "Pauta do comercial",
            meetingUrl: "https://meet.google.com/abc-defg-hij",
            location: "Sala 2",
            meetingKindLabel: "Reunião",
            assigneeName: "Ana",
          }),
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Nova reunião" })).toBeTruthy();
    expect(screen.getByText("Pauta do comercial")).toBeTruthy();
    expect(screen.getByText("Sala 2")).toBeTruthy();
    expect(screen.getByText("Ana")).toBeTruthy();
    const link = screen.getByRole("link", {
      name: "https://meet.google.com/abc-defg-hij",
    });
    expect(link.getAttribute("href")).toBe("https://meet.google.com/abc-defg-hij");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
  });

  it("renders the page header and filters on paper, not Card chrome", () => {
    render(
      <AgendaView
        events={[event({ id: "due-1", kind: "due", title: "Evento due" })]}
      />
    );

    const header = screen.getByRole("heading", { name: "Agenda" }).closest(
      "header"
    );
    expect(header?.className).toMatch(/bg-background/);
    expect(header?.className).not.toMatch(/bg-card/);

    const filters = screen.getByRole("heading", { name: "Filtros" });
    expect(filters.tagName).toBe("H2");
    expect(filters.closest("[class*='bg-card']")).toBeNull();
  });
});
