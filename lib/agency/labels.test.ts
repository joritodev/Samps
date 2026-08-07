import { describe, expect, it } from "vitest";
import {
  canCompleteProduction,
  canDemandBriefing,
  canRegisterPublication,
  canRequestAdjustment,
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

  it("libera publicacao em aprovado, agendado e revisao", () => {
    expect(canRegisterPublication("APPROVED")).toBe(true);
    expect(canRegisterPublication("SCHEDULED")).toBe(true);
    expect(canRegisterPublication("IN_REVIEW")).toBe(true);
    expect(canRegisterPublication("PLANNING")).toBe(false);
  });
});
