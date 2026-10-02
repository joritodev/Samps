// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./notification-bell";

const push = vi.fn();
const markRead = vi.fn().mockResolvedValue({ success: true });
const markAll = vi.fn().mockResolvedValue({ success: true, count: 2 });
const list = vi.fn();
const count = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>{children}</a>
  ),
}));
vi.mock("@/lib/actions/notifications.actions", () => ({
  getUnreadNotificationCountAction: () => count(),
  listRecentNotificationsAction: () => list(),
  markNotificationReadAction: (...a: unknown[]) => markRead(...a),
  markAllNotificationsReadAction: () => markAll(),
}));

const items = [
  { id: "a", type: "ADJUSTMENT_REQUESTED", title: "Ajuste solicitado", message: "Banner voltou", link: "/demandas", read: false, createdAt: new Date().toISOString() },
  { id: "b", type: "OTHER", title: "Pronto para publicar", message: "Stories", link: null, read: true, createdAt: new Date().toISOString() },
];

beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue(1);
  list.mockResolvedValue({ items, unread: 1 });
});
afterEach(cleanup);

describe("NotificationBell", () => {
  it("mostra o selo com a contagem e rótulo acessível", async () => {
    render(<NotificationBell />);
    expect(await screen.findByText("Notificações, 1 não lidas")).toBeTruthy();
  });

  it("abre a prévia, filtra não lidas e marca como lida ao clicar", async () => {
    render(<NotificationBell />);
    await screen.findByText("Notificações, 1 não lidas");
    fireEvent.click(screen.getByRole("button", { name: /Notificações/ }));
    expect(await screen.findByText("Ajuste solicitado")).toBeTruthy();
    expect(screen.getByText("Pronto para publicar")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Não lidas/ }));
    expect(screen.queryByText("Pronto para publicar")).toBeNull();

    fireEvent.click(screen.getByText("Ajuste solicitado"));
    expect(markRead).toHaveBeenCalledWith("a");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/demandas"));
  });

  it("marcar todas chama a ação e desabilita o botão", async () => {
    render(<NotificationBell />);
    await screen.findByText("Notificações, 1 não lidas");
    fireEvent.click(screen.getByRole("button", { name: /Notificações/ }));
    const btn = (await screen.findByRole("button", { name: "Marcar todas como lidas" })) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(markAll).toHaveBeenCalled();
    await waitFor(() => expect(btn.disabled).toBe(true));
  });

  it("tem link para ver todas", async () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /Notificações/ }));
    const link = await screen.findByRole("link", { name: "Ver todas as notificações" });
    expect(link.getAttribute("href")).toBe("/notificacoes");
  });
});
