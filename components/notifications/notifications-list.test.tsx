// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsList } from "./notifications-list";

const push = vi.fn();
const markRead = vi.fn().mockResolvedValue({ success: true });
const markAll = vi.fn().mockResolvedValue({ success: true, count: 2 });

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/lib/actions/notifications.actions", () => ({
  markNotificationReadAction: (...a: unknown[]) => markRead(...a),
  markAllNotificationsReadAction: () => markAll(),
}));

// Relógio fixo ao meio-dia: com Date.now() o teste falhava na primeira hora depois de 00h UTC,
// quando "5 minutos atrás" cai no dia anterior e o grupo "Hoje" some.
const now = new Date("2026-10-09T15:00:00Z").getTime();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const rows = [
  { id: "a", type: "ADJUSTMENT_REQUESTED", title: "Ajuste solicitado", message: "Banner voltou", link: "/demandas", read: false, createdAt: iso(5 * 60_000) },
  { id: "b", type: "DEMAND_ASSIGNED", title: "Demanda atribuída a você", message: "Carrossel", link: null, read: false, createdAt: iso(60 * 60_000) },
  { id: "c", type: "OTHER", title: "Material aguardando revisão", message: "Stories", link: null, read: true, createdAt: iso(10 * 86_400_000) },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("NotificationsList", () => {
  it("agrupa por dia e mostra contagens nos filtros", () => {
    render(<NotificationsList initial={rows} />);
    expect(screen.getByRole("region", { name: "Hoje" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Anteriores" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Não lidas/ }).textContent).toContain("2");
  });

  it("filtra por não lidas e por grupo", () => {
    render(<NotificationsList initial={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /Não lidas/ }));
    expect(screen.queryByText("Material aguardando revisão")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Ajustes e comentários/ }));
    expect(screen.getByText("Ajuste solicitado")).toBeTruthy();
    expect(screen.queryByText("Demanda atribuída a você")).toBeNull();
  });

  it("clicar marca como lida e navega quando há link", () => {
    render(<NotificationsList initial={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /Ajuste solicitado/ }));
    expect(markRead).toHaveBeenCalledWith("a");
    expect(push).toHaveBeenCalledWith("/demandas");
  });

  it("clicar sem link só marca como lida", () => {
    render(<NotificationsList initial={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /Demanda atribuída a você/ }));
    expect(markRead).toHaveBeenCalledWith("b");
    expect(push).not.toHaveBeenCalled();
  });

  it("marcar todas zera as não lidas e desabilita o botão", () => {
    render(<NotificationsList initial={rows} />);
    const btn = screen.getByRole("button", { name: "Marcar todas como lidas" }) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(markAll).toHaveBeenCalled();
    expect(btn.disabled).toBe(true);
    expect(within(screen.getByRole("group", { name: "Filtros" })).getByRole("button", { name: /Não lidas/ }).textContent).toContain("0");
  });

  it("mostra 'Tudo em dia' sem notificações", () => {
    render(<NotificationsList initial={[]} />);
    expect(screen.getByText("Tudo em dia")).toBeTruthy();
  });
});
