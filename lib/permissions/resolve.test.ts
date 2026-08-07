import { describe, expect, it } from "vitest";
import { canAccessClient, hasPermission } from "./resolve";

describe("hasPermission", () => {
  it("reconhece a permissao presente", () => {
    expect(hasPermission(["clients.edit"], "clients.edit")).toBe(true);
  });

  it("nega quando a permissao nao esta na lista", () => {
    expect(hasPermission(["clients.view_all"], "clients.edit")).toBe(false);
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
});
