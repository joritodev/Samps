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
  DEMAND_ACTION_DENIED,
} from "./labels";

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
