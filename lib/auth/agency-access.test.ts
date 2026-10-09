import { describe, expect, it } from "vitest";
import { agencyAccessRedirect } from "@/types/auth";

describe("agencyAccessRedirect", () => {
  it("editor de vídeo não entra no painel da gestão nem no quadro de outro setor", () => {
    const perms = ["clients.view_assigned"];
    expect(agencyAccessRedirect("/painel-gestao", "VIDEO_EDITOR", perms)).toBe("/meu-painel/video");
    expect(agencyAccessRedirect("/meu-painel/design", "VIDEO_EDITOR", perms)).toBe("/meu-painel/video");
    expect(agencyAccessRedirect("/setores/design", "VIDEO_EDITOR", perms)).toBe("/meu-painel/video");
    expect(agencyAccessRedirect("/performance", "VIDEO_EDITOR", perms)).toBe("/meu-painel/video");
    expect(agencyAccessRedirect("/equipe", "VIDEO_EDITOR", perms)).toBe("/meu-painel/video");
    expect(agencyAccessRedirect("/historico", "VIDEO_EDITOR", perms)).toBe("/meu-painel/video");
  });

  it("deixa o próprio painel, o resumo e o quadro do próprio setor", () => {
    const perms = ["clients.view_assigned"];
    expect(agencyAccessRedirect("/meu-painel/video", "VIDEO_EDITOR", perms)).toBeNull();
    expect(agencyAccessRedirect("/performance/meu-resumo", "VIDEO_EDITOR", perms)).toBeNull();
    expect(agencyAccessRedirect("/setores/video", "VIDEO_EDITOR", perms)).toBeNull();
    expect(agencyAccessRedirect("/demandas", "VIDEO_EDITOR", perms)).toBeNull();
  });

  it("gestão entra no painel e na performance", () => {
    const perms = ["productivity.view", "users.edit", "history.view", "clients.view_all"];
    expect(agencyAccessRedirect("/painel-gestao", "MANAGEMENT", perms)).toBeNull();
    expect(agencyAccessRedirect("/performance", "MANAGEMENT", perms)).toBeNull();
    expect(agencyAccessRedirect("/setores/design", "MANAGEMENT", perms)).toBeNull();
    expect(agencyAccessRedirect("/equipe", "MANAGEMENT", perms)).toBeNull();
  });
});

describe("agencyAccessRedirect: planejamento semanal", () => {
  it("sem planning.view volta para a home do perfil", () => {
    expect(agencyAccessRedirect("/planejamento-semanal", "DESIGNER", ["demands.edit"])).toBe(
      "/meu-painel/design",
    );
    expect(agencyAccessRedirect("/planejamento-semanal/video", "VIDEOMAKER", [])).toBe(
      "/meu-painel/video",
    );
  });

  it("com planning.view entra nos dois setores", () => {
    const perms = ["planning.view"];
    expect(agencyAccessRedirect("/planejamento-semanal", "DESIGNER", perms)).toBeNull();
    expect(agencyAccessRedirect("/planejamento-semanal/video", "DESIGNER", perms)).toBeNull();
    expect(agencyAccessRedirect("/planejamento-semanal/design", "VIDEOMAKER", perms)).toBeNull();
  });
});
