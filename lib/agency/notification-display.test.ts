import { describe, expect, it } from "vitest";
import {
  dayBucket,
  notificationGroup,
  notificationIcon,
  notificationTone,
  relativeTime,
} from "@/lib/agency/notification-display";

const now = new Date(2026, 9, 2, 14, 0, 0);
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m, d, h, min);

describe("notificationGroup", () => {
  it("espelha os grupos das preferências", () => {
    expect(notificationGroup("DEMAND_OVERDUE")).toBe("DEADLINE");
    expect(notificationGroup("DEMAND_ASSIGNED")).toBe("ASSIGNMENT");
    expect(notificationGroup("NEW_COMMENT")).toBe("ADJUSTMENT");
    expect(notificationGroup("INFO_RELEASED")).toBe("PUBLICATION");
    expect(notificationGroup("OTHER")).toBe("OTHER");
    expect(notificationGroup("QUALQUER")).toBe("OTHER");
  });
});

describe("tom e ícone", () => {
  it("cor só em ajuste, atraso e publicação", () => {
    expect(notificationTone("ADJUSTMENT_REQUESTED")).toBe("attention");
    expect(notificationTone("DEMAND_OVERDUE")).toBe("danger");
    expect(notificationTone("INFO_RELEASED")).toBe("success");
    expect(notificationTone("NEW_DEMAND")).toBe("neutral");
  });
  it("OTHER usa o título para distinguir publicação", () => {
    expect(notificationIcon("OTHER", "Conteúdo publicado")).toBe("check");
    expect(notificationIcon("OTHER", "Pronto para publicar")).toBe("check");
    expect(notificationIcon("OTHER", "Convite")).toBe("bell");
    expect(notificationIcon("NEW_COMMENT")).toBe("mention");
  });
});

describe("dayBucket", () => {
  it("agrupa por dia", () => {
    expect(dayBucket(at(2026, 9, 2, 8), now)).toBe("Hoje");
    expect(dayBucket(at(2026, 9, 1, 23), now)).toBe("Ontem");
    expect(dayBucket(at(2026, 8, 30), now)).toBe("Esta semana");
    expect(dayBucket(at(2026, 8, 20), now)).toBe("Anteriores");
  });
});

describe("relativeTime", () => {
  it("formata em português curto", () => {
    expect(relativeTime(new Date(now.getTime() - 20_000), now)).toBe("agora");
    expect(relativeTime(new Date(now.getTime() - 12 * 60_000), now)).toBe("há 12 min");
    expect(relativeTime(new Date(now.getTime() - 3 * 3600_000), now)).toBe("há 3 h");
    expect(relativeTime(at(2026, 9, 1, 13), now)).toBe("ontem");
    expect(relativeTime(at(2026, 8, 30), now)).toMatch(/^30 set/);
  });
});
