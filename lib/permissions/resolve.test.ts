import { describe, expect, it } from "vitest";
import {
  canAccessClient,
  canSeeManagementDashboard,
  canSeeTeamDirectory,
  hasAnyPermission,
  hasPermission,
} from "./resolve";

describe("hasPermission", () => {
  it("reconhece a permissao presente", () => {
    expect(hasPermission(["clients.edit"], "clients.edit")).toBe(true);
  });

  it("nega quando a permissao nao esta na lista", () => {
    expect(hasPermission(["clients.view_all"], "clients.edit")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("aceita se qualquer codigo estiver presente", () => {
    expect(
      hasAnyPermission(["users.create"], ["users.edit", "users.create"])
    ).toBe(true);
  });

  it("nega quando nenhum codigo esta presente", () => {
    expect(
      hasAnyPermission(["demands.edit"], ["users.edit", "users.create"])
    ).toBe(false);
  });
});

describe("canSeeManagementDashboard", () => {
  it("libera admin e gestao", () => {
    expect(canSeeManagementDashboard("ADMIN")).toBe(true);
    expect(canSeeManagementDashboard("MANAGEMENT")).toBe(true);
  });

  it("bloqueia social e colaboradores mesmo com indicators.view no papel", () => {
    expect(canSeeManagementDashboard("SOCIAL_MEDIA")).toBe(false);
    expect(canSeeManagementDashboard("DESIGNER")).toBe(false);
    expect(canSeeManagementDashboard("EXTERNAL_CLIENT")).toBe(false);
  });
});

describe("canSeeTeamDirectory", () => {
  it("libera quem convida ou edita usuarios", () => {
    expect(canSeeTeamDirectory(["users.create"])).toBe(true);
    expect(canSeeTeamDirectory(["users.edit"])).toBe(true);
  });

  it("bloqueia colaborador sem gestao de equipe", () => {
    expect(canSeeTeamDirectory(["demands.edit", "clients.view_assigned"])).toBe(
      false
    );
  });
});

describe("canAccessClient", () => {
  it("permite quem tem visao global", () => {
    expect(canAccessClient(["clients.view_all"], [], "c1")).toBe(true);
  });

  it("permite apenas os clientes vinculados quando tem view_assigned", () => {
    expect(canAccessClient(["clients.view_assigned"], ["c1"], "c1")).toBe(true);
    expect(canAccessClient(["clients.view_assigned"], ["c1"], "c2")).toBe(
      false
    );
    expect(canAccessClient([], ["c1"], "c1")).toBe(false);
  });

  it("permite o cliente externo ver so a propria conta via portal.view", () => {
    expect(canAccessClient(["portal.view"], ["c1"], "c1")).toBe(true);
    expect(canAccessClient(["portal.view"], ["c1"], "c2")).toBe(false);
  });
});
