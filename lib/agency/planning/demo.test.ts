import { describe, expect, it } from "vitest";
import {
  DEMO_POSITION_BASE,
  demoCategory,
  demoHours,
  demoKind,
  demoMemberColor,
  demoStatusForDemand,
  demoTitle,
  isDemoCard,
  isOpenDemandStatus,
  shootHours,
  weekdayOfKey,
} from "./demo";
import { PLAN_SECTOR_CONFIG } from "./config";

describe("marcador de exemplo", () => {
  const base = { createdById: null, templateId: null, clientName: "COCO", position: DEMO_POSITION_BASE };
  it("reconhece o card do script", () => {
    expect(isDemoCard(base)).toBe(true);
  });
  it("card criado por pessoa, gerado por modelo, sem cliente ou já mexido não é exemplo", () => {
    expect(isDemoCard({ ...base, createdById: "u1" })).toBe(false);
    expect(isDemoCard({ ...base, templateId: "t1" })).toBe(false);
    expect(isDemoCard({ ...base, clientName: null })).toBe(false);
    expect(isDemoCard({ ...base, position: 3 })).toBe(false);
  });
});

describe("mapeamento das demandas", () => {
  it("tipo, categoria e tipos válidos para o setor", () => {
    expect(demoKind("video", "reels")).toBe("video");
    expect(demoKind("design", "carrossel")).toBe("carrossel");
    expect(demoKind("design", "motion")).toBe("video_template");
    expect(demoKind("design", "estatico")).toBe("peca");
    for (const [sector, slug] of [
      ["design", "carrossel"],
      ["design", "motion"],
      ["design", "stories"],
      ["video", "reels"],
    ] as const) {
      const kind = demoKind(sector, slug);
      expect(PLAN_SECTOR_CONFIG[sector].kinds.some((k) => k.value === kind)).toBe(true);
    }
  });

  it("duração: vídeo pelo tamanho, design por tipo", () => {
    expect(demoHours("video", "reels", 30)).toBe(1.5);
    expect(demoHours("video", "reels", 45)).toBe(2);
    expect(demoHours("video", "video", 120)).toBe(3);
    expect(demoHours("video", "stories", null)).toBe(1);
    expect(demoHours("design", "carrossel", null)).toBe(1.5);
    expect(demoHours("design", "estatico", null)).toBe(0.5);
    expect(demoHours("design", "outro", null)).toBe(1);
  });

  it("categoria sempre existe no setor", () => {
    expect(demoCategory("design", "Terra Viva Imóveis", "Feed — Vista Verde")).toBe("Lançamento");
    expect(demoCategory("video", "Terra Viva Imóveis", "Reel — obra")).toBe("Institucional");
    expect(demoCategory("design", "Mendes & Prado Advogados", "Feed — dúvida")).toBe("Institucional");
    expect(demoCategory("design", "Doce Raiz", "Stories — últimas vagas de encomenda")).toBe("Tráfego");
    expect(demoCategory("design", "Studio Vita", "Feed — postura")).toBe("Orgânico");
    for (const sector of ["design", "video"] as const) {
      for (const client of ["Terra Viva", "Mendes", "Doce Raiz"]) {
        expect(PLAN_SECTOR_CONFIG[sector].categories).toContain(demoCategory(sector, client, "x"));
      }
    }
  });

  it("status do card e demanda aberta", () => {
    expect(demoStatusForDemand("IN_PRODUCTION")).toBe("EM_EDICAO");
    expect(demoStatusForDemand("IN_REVIEW")).toBe("REVISAO");
    expect(demoStatusForDemand("ADJUSTMENTS")).toBe("REVISAO");
    expect(demoStatusForDemand("DEMANDED")).toBe("PROGRAMADO");
    expect(isOpenDemandStatus("DEMANDED")).toBe(true);
    expect(isOpenDemandStatus("PUBLISHED")).toBe(false);
    expect(isOpenDemandStatus("CANCELLED")).toBe(false);
  });

  it("título sem o mês e limitado", () => {
    expect(demoTitle("Carrossel — Cuidados com a saúde bucal (outubro)")).toBe("Carrossel — Cuidados com a saúde bucal");
    expect(demoTitle("Sem mês")).toBe("Sem mês");
    expect(demoTitle("x".repeat(200))).toHaveLength(120);
  });
});

describe("datas e captações", () => {
  it("dia da semana de uma data", () => {
    expect(weekdayOfKey("2026-10-05")).toBe(1);
    expect(weekdayOfKey("2026-10-09")).toBe(5);
    expect(weekdayOfKey("2026-10-10")).toBe(6);
    expect(weekdayOfKey("2026-10-11")).toBe(7);
  });
  it("duração da captação", () => {
    expect(shootHours("09:00", "12:30")).toBe(3.5);
    expect(shootHours("14:00", "14:10")).toBe(0.25);
    expect(shootHours(null, null)).toBe(3);
    expect(shootHours("15:00", "14:00")).toBe(3);
    expect(shootHours("06:00", "23:00")).toBe(8);
  });
  it("cores das pessoas giram", () => {
    expect(demoMemberColor(0)).toMatch(/^#[0-9a-f]{6}$/);
    expect(demoMemberColor(0)).toBe(demoMemberColor(6));
  });
});
