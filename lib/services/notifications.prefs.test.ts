import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
} from "./notifications.service";

describe("parseNotificationPrefs delivery", () => {
  it("default: toast ligado, som desligado", () => {
    const p = parseNotificationPrefs(null);
    expect(p.toastAnnouncements).toBe(true);
    expect(p.soundAnnouncements).toBe(false);
    expect(p.toastNotifications).toBe(true);
    expect(p.soundNotifications).toBe(false);
    expect(p.DEADLINE).toBe(true);
    expect(p).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("respeita false explícito no toast e true no som", () => {
    const p = parseNotificationPrefs({
      toastAnnouncements: false,
      soundAnnouncements: true,
    });
    expect(p.toastAnnouncements).toBe(false);
    expect(p.soundAnnouncements).toBe(true);
    expect(p.ASSIGNMENT).toBe(true);
  });

  it("resumos por e-mail: ligado por padrão, só desliga com false explícito", () => {
    expect(parseNotificationPrefs(null).emailReports).toBe(true);
    expect(parseNotificationPrefs({}).emailReports).toBe(true);
    expect(parseNotificationPrefs({ emailReports: "nao" }).emailReports).toBe(true);
    expect(parseNotificationPrefs({ emailReports: false }).emailReports).toBe(false);
  });
});
