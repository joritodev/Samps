import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuth = vi.fn();
const markNotificationRead = vi.fn();
const markAllNotificationsRead = vi.fn();
const listUserNotifications = vi.fn();
const countUnread = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/permissions/check", () => ({ requireAuth: () => requireAuth() }));
vi.mock("@/lib/services/notifications.service", () => ({
  countUnreadNotifications: (...a: unknown[]) => countUnread(...a),
  listUserNotifications: (...a: unknown[]) => listUserNotifications(...a),
  markNotificationRead: (...a: unknown[]) => markNotificationRead(...a),
  markAllNotificationsRead: (...a: unknown[]) => markAllNotificationsRead(...a),
}));

import {
  listRecentNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications.actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireAuth.mockResolvedValue({ id: "u1" });
});

describe("notifications.actions", () => {
  it("marca como lida sempre com o id do usuário da sessão", async () => {
    markNotificationRead.mockResolvedValue({ count: 1 });
    await markNotificationReadAction("n1");
    expect(markNotificationRead).toHaveBeenCalledWith("n1", "u1");
  });
  it("ignora id inválido", async () => {
    const r = await markNotificationReadAction("");
    expect(r.success).toBe(false);
    expect(markNotificationRead).not.toHaveBeenCalled();
  });
  it("marcar todas usa o usuário da sessão", async () => {
    markAllNotificationsRead.mockResolvedValue({ count: 3 });
    const r = await markAllNotificationsReadAction();
    expect(markAllNotificationsRead).toHaveBeenCalledWith("u1");
    expect(r.count).toBe(3);
  });
  it("lista recentes serializada, com limite e contagem", async () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`, type: "OTHER", title: "t", message: "m", link: null, read: i > 2,
      createdAt: new Date(2026, 9, 2, 10, i),
    }));
    listUserNotifications.mockResolvedValue(rows);
    countUnread.mockResolvedValue(3);
    const r = await listRecentNotificationsAction(5);
    expect(r.items).toHaveLength(5);
    expect(r.unread).toBe(3);
    expect(typeof r.items[0].createdAt).toBe("string");
    expect(listUserNotifications).toHaveBeenCalledWith("u1", false);
  });
});
