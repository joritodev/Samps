import { describe, expect, it } from "vitest";
import { canSeeSettingsSection } from "./settings-access";

describe("canSeeSettingsSection", () => {
  it("aparencia e notificacoes sao pessoais", () => {
    expect(canSeeSettingsSection([], "/configuracoes/temas")).toBe(true);
    expect(canSeeSettingsSection([], "/configuracoes/notificacoes")).toBe(true);
  });

  it("configuracao do portal exige settings.access, nao so portal.view", () => {
    expect(
      canSeeSettingsSection(["portal.view"], "/configuracoes/portal")
    ).toBe(false);
    expect(
      canSeeSettingsSection(["settings.access"], "/configuracoes/portal")
    ).toBe(true);
  });

  it("funcoes exige roles.manage", () => {
    expect(
      canSeeSettingsSection(["settings.access"], "/configuracoes/funcoes")
    ).toBe(false);
    expect(
      canSeeSettingsSection(["roles.manage"], "/configuracoes/funcoes")
    ).toBe(true);
  });
});
