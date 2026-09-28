import { describe, expect, it } from "vitest";
import { missingBriefingFields } from "./content-type-requirements";

const noRequirements = {
  requiresDuration: false,
  requiresFormat: false,
  requiresCaption: false,
  requiresReference: false,
  requiresRawDelivery: false,
};

describe("missingBriefingFields", () => {
  it("retorna vazio quando nenhum campo e obrigatorio", () => {
    expect(missingBriefingFields(noRequirements, {})).toEqual([]);
  });

  it("retorna duracao quando requiresDuration e falta durationSeconds", () => {
    const req = { ...noRequirements, requiresDuration: true };
    expect(missingBriefingFields(req, { durationSeconds: null })).toContain(
      "duração (segundos)"
    );
  });

  it("nao retorna duracao quando durationSeconds preenchido", () => {
    const req = { ...noRequirements, requiresDuration: true };
    expect(missingBriefingFields(req, { durationSeconds: 30 })).toEqual([]);
  });

  it("retorna formato quando requiresFormat e falta format e orientation", () => {
    const req = { ...noRequirements, requiresFormat: true };
    expect(missingBriefingFields(req, {})).toContain("formato/orientação");
    expect(missingBriefingFields(req, { format: "9:16" })).toEqual([]);
  });

  it("aceita orientation no lugar de format", () => {
    const req = { ...noRequirements, requiresFormat: true };
    expect(missingBriefingFields(req, { orientation: "9:16 vertical" })).toEqual(
      []
    );
  });

  it("retorna legenda quando requiresCaption e falta caption", () => {
    const req = { ...noRequirements, requiresCaption: true };
    expect(missingBriefingFields(req, { caption: null })).toContain("legenda");
    expect(missingBriefingFields(req, { caption: "Sim" })).toEqual([]);
  });

  it("retorna referencia e entrega bruta quando faltam", () => {
    const req = {
      ...noRequirements,
      requiresReference: true,
      requiresRawDelivery: true,
    };
    const gaps = missingBriefingFields(req, { reference: "  ", rawDelivery: false });
    expect(gaps).toContain("referência");
    expect(gaps).toContain("entrega bruta");
    expect(
      missingBriefingFields(req, { reference: "Link do roteiro", rawDelivery: true })
    ).toEqual([]);
  });

  it("acumula varios campos ausentes", () => {
    const req = {
      requiresDuration: true,
      requiresFormat: true,
      requiresCaption: true,
      requiresReference: false,
      requiresRawDelivery: false,
    };
    const gaps = missingBriefingFields(req, {});
    expect(gaps).toHaveLength(3);
  });
});
