import { describe, expect, it } from "vitest";
import {
  assertCanCompleteProduction,
  assertCanRegisterPublication,
  assertCanRequestAdjustment,
  canCompleteProduction,
  canDemandBriefing,
  canRegisterPublication,
  canRequestAdjustment,
  canReviewDemand,
  isDemandClosedForProduction,
  productionCompletionBlock,
  DEMAND_ACTION_DENIED,
  demandOriginLabel,
  demandStatusLabel,
  demandTypeLabel,
} from "./labels";

describe("rótulos de enum na UI", () => {
  it("traduz tipo, origem e status sem vazar o código do enum", () => {
    expect(demandTypeLabel("STORY")).toBe("Story");
    expect(demandOriginLabel("SOCIAL_PANEL")).toBe("Social");
    expect(demandStatusLabel("SCHEDULED")).toBe("Agendada");
  });

  it("devolve o valor original quando não conhece o código", () => {
    expect(demandTypeLabel("NOVO")).toBe("NOVO");
    expect(demandOriginLabel("NOVO")).toBe("NOVO");
  });
});

describe("regras de acao por status", () => {
  it("permite demandar somente em planejamento", () => {
    expect(canDemandBriefing("PLANNING")).toBe(true);
    expect(canDemandBriefing("PENDING_PLANNING")).toBe(true);
    expect(canDemandBriefing("IN_PRODUCTION")).toBe(false);
    expect(canDemandBriefing("DONE")).toBe(false);
  });

  it("bloqueia demandar quando o briefing esta travado", () => {
    expect(canDemandBriefing("PLANNING", new Date())).toBe(false);
  });

  it("libera producao apenas em producao ou ajuste", () => {
    expect(canCompleteProduction("IN_PRODUCTION")).toBe(true);
    expect(canCompleteProduction("ADJUSTMENTS")).toBe(true);
    expect(canCompleteProduction("IN_REVIEW")).toBe(false);
  });

  it("libera ajuste apenas em revisao", () => {
    expect(canRequestAdjustment("IN_REVIEW")).toBe(true);
    expect(canRequestAdjustment("IN_PRODUCTION")).toBe(false);
  });

  it("fecha atribuir e iniciar depois da revisão", () => {
    expect(isDemandClosedForProduction("IN_REVIEW")).toBe(true);
    expect(isDemandClosedForProduction("APPROVED")).toBe(true);
    expect(isDemandClosedForProduction("PUBLISHED")).toBe(true);
    expect(isDemandClosedForProduction("DONE")).toBe(true);
    expect(isDemandClosedForProduction("IN_PRODUCTION")).toBe(false);
    expect(isDemandClosedForProduction("ADJUSTMENTS")).toBe(false);
    expect(isDemandClosedForProduction("DEMANDED")).toBe(false);
  });

  it("libera publicacao em aprovado e agendado", () => {
    expect(canRegisterPublication("APPROVED")).toBe(true);
    expect(canRegisterPublication("SCHEDULED")).toBe(true);
    expect(canRegisterPublication("IN_REVIEW")).toBe(false);
    expect(canRegisterPublication("PLANNING")).toBe(false);
  });

  it("revisao so para social, gestao e admin", () => {
    expect(canReviewDemand("SOCIAL_MEDIA")).toBe(true);
    expect(canReviewDemand("MANAGEMENT")).toBe(true);
    expect(canReviewDemand("ADMIN")).toBe(true);
    expect(canReviewDemand("DESIGNER")).toBe(false);
    expect(canReviewDemand("VIDEOMAKER")).toBe(false);
  });
});

describe("assertCan*", () => {
  it("nao lanca quando o status permite", () => {
    expect(() => assertCanCompleteProduction("IN_PRODUCTION")).not.toThrow();
    expect(() => assertCanRequestAdjustment("IN_REVIEW")).not.toThrow();
    expect(() => assertCanRegisterPublication("APPROVED")).not.toThrow();
  });

  it("lanca a mensagem canonica quando o status nao permite", () => {
    expect(() => assertCanCompleteProduction("PLANNING")).toThrow(
      DEMAND_ACTION_DENIED.production
    );
    expect(() => assertCanRequestAdjustment("IN_PRODUCTION")).toThrow(
      DEMAND_ACTION_DENIED.adjustment
    );
    expect(() => assertCanRegisterPublication("PLANNING")).toThrow(
      DEMAND_ACTION_DENIED.publication
    );
  });
});

describe("conclusão de produção sem carteira do cliente", () => {
  it("deixa o executor concluir mesmo sem ver o cliente", () => {
    expect(
      productionCompletionBlock({ isExecutor: true, canSeeClient: false })
    ).toBe("ok");
  });

  it("esconde a demanda de quem não executa e não vê o cliente", () => {
    expect(
      productionCompletionBlock({ isExecutor: false, canSeeClient: false })
    ).toBe("hidden");
  });

  it("nega com clareza quem vê o cliente mas não é o executor", () => {
    expect(
      productionCompletionBlock({ isExecutor: false, canSeeClient: true })
    ).toBe("not-executor");
  });
});
