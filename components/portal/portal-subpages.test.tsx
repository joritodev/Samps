// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  PortalArquivos,
  PortalCalendario,
  PortalEntregas,
  PortalMateriais,
  PortalNotificacoes,
  PortalPublicacoes,
} from "./portal-subpages";

afterEach(() => {
  cleanup();
});

function heading(name: string) {
  return screen.getByRole("heading", { level: 1, name });
}

function itemSurface(label: string) {
  const node = screen.getByText(label);
  let el: HTMLElement | null = node;
  while (el && !/rounded-xl/.test(el.className)) {
    el = el.parentElement;
  }
  return el;
}

describe("portal subpages", () => {
  it("Calendário uses PortalPage density and empty copy with a verb", () => {
    const { container } = render(<PortalCalendario demands={[]} />);

    const h1 = heading("Calendário");
    expect(h1.className).toMatch(/font-display/);
    expect(h1.className).toMatch(/text-2xl/);
    expect(h1.className).not.toMatch(/text-3xl/);
    expect(screen.queryByText("Nenhum evento no calendário.")).toBeNull();
    expect(container.textContent).toMatch(/aparecem/i);
    expect(container.innerHTML).not.toMatch(/shadow-sm/);
  });

  it("Calendário rows use a light card without shadow", () => {
    render(
      <PortalCalendario
        demands={[
          {
            id: "d1",
            title: "Campanha de lançamento",
            deliveryDate: "2026-09-01",
            publishDate: "2026-09-05",
          },
        ]}
      />
    );

    const card = itemSurface("Campanha de lançamento");
    expect(card?.className).toMatch(/border-border\/60/);
    expect(card?.className).toMatch(/bg-card\/50/);
    expect(card?.className).not.toMatch(/shadow-sm/);
    expect(screen.getByText(/Entrega:/)).toBeTruthy();
    expect(screen.getByText(/Publicação:/)).toBeTruthy();
  });

  it("Entregas wraps in PortalPage and empty uses a verb", () => {
    const { container } = render(<PortalEntregas demands={[]} />);

    expect(heading("Próximas entregas").className).toMatch(/text-2xl/);
    expect(screen.queryByText("Nenhuma entrega programada.")).toBeNull();
    expect(container.textContent).toMatch(/aparecem/i);
  });

  it("Entregas rows use a light card", () => {
    render(
      <PortalEntregas
        demands={[
          {
            id: "d1",
            title: "Peça institucional",
            type: "POST",
            deliveryDate: "2026-09-01",
          },
        ]}
      />
    );

    const card = itemSurface("Peça institucional");
    expect(card?.className).toMatch(/border-border\/60/);
    expect(card?.className).toMatch(/bg-card\/50/);
    expect(card?.className).not.toMatch(/shadow-sm/);
  });

  it("Publicações wraps in PortalPage and empty uses a verb", () => {
    const { container } = render(<PortalPublicacoes demands={[]} />);

    expect(heading("Próximas publicações").className).toMatch(/text-2xl/);
    expect(screen.queryByText("Nenhuma publicação programada.")).toBeNull();
    expect(container.textContent).toMatch(/aparecem/i);
  });

  it("Publicações rows use a light card", () => {
    render(
      <PortalPublicacoes
        demands={[
          {
            id: "d1",
            title: "Reels da semana",
            type: "POST",
            format: "Reels",
            publishDate: "2026-09-05",
          },
        ]}
      />
    );

    const card = itemSurface("Reels da semana");
    expect(card?.className).toMatch(/border-border\/60/);
    expect(card?.className).toMatch(/bg-card\/50/);
    expect(screen.getByText("Reels")).toBeTruthy();
  });

  it("Materiais wraps in PortalPage and empty uses a verb", () => {
    const { container } = render(<PortalMateriais demands={[]} />);

    expect(heading("Materiais concluídos").className).toMatch(/text-2xl/);
    expect(screen.queryByText("Nenhum material concluído.")).toBeNull();
    expect(container.textContent).toMatch(/aparecem/i);
  });

  it("Materiais rows use a light card", () => {
    render(
      <PortalMateriais
        demands={[
          {
            id: "d1",
            title: "Manual de marca",
            type: "POST",
            status: "DONE",
            deliveryDate: "2026-08-01",
          },
        ]}
      />
    );

    const card = itemSurface("Manual de marca");
    expect(card?.className).toMatch(/border-border\/60/);
    expect(card?.className).toMatch(/bg-card\/50/);
    expect(card?.className).not.toMatch(/shadow-sm/);
  });

  it("Arquivos wraps in PortalPage and empty uses a verb", () => {
    const { container } = render(<PortalArquivos files={[]} />);

    expect(heading("Arquivos").className).toMatch(/text-2xl/);
    expect(screen.queryByText("Nenhum arquivo disponível.")).toBeNull();
    expect(container.textContent).toMatch(/aparecem/i);
  });

  it("Arquivos rows use a light card", () => {
    render(
      <PortalArquivos
        files={[
          {
            id: "f1",
            name: "briefing.pdf",
            fileType: "PDF",
            createdAt: "2026-08-01",
          },
        ]}
      />
    );

    const card = itemSurface("briefing.pdf");
    expect(card?.className).toMatch(/border-border\/60/);
    expect(card?.className).toMatch(/bg-card\/50/);
    expect(card?.className).not.toMatch(/shadow-sm/);
  });

  it("Notificações wraps in PortalPage and empty uses a verb", () => {
    const { container } = render(<PortalNotificacoes notifications={[]} />);

    expect(heading("Notificações").className).toMatch(/text-2xl/);
    expect(screen.queryByText("Nenhuma notificação.")).toBeNull();
    expect(container.textContent).toMatch(/aparecem/i);
  });

  it("Notificações rows use a light card", () => {
    render(
      <PortalNotificacoes
        notifications={[
          {
            id: "n1",
            title: "Nova entrega",
            message: "O material está pronto.",
            createdAt: "2026-08-01T12:00:00.000Z",
            read: false,
          },
        ]}
      />
    );

    const card = itemSurface("Nova entrega");
    expect(card?.className).toMatch(/border-border\/60/);
    expect(card?.className).toMatch(/bg-card\/50/);
    expect(card?.className).not.toMatch(/shadow-sm/);
    expect(screen.getByText("Nova")).toBeTruthy();
  });
});
