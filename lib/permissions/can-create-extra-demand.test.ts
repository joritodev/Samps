import { describe, expect, it } from "vitest";
import { canCreateExtraDemand } from "./can-create-extra-demand";

describe("canCreateExtraDemand", () => {
  it("permite com demands.extra_create", () => {
    expect(canCreateExtraDemand(["demands.extra_create"])).toBe(true);
  });

  it("permite com demands.create", () => {
    expect(canCreateExtraDemand(["demands.create"])).toBe(true);
  });

  it("permite com ambas", () => {
    expect(
      canCreateExtraDemand(["demands.create", "demands.extra_create"])
    ).toBe(true);
  });

  it("nega sem nenhuma das permissões", () => {
    expect(canCreateExtraDemand(["demands.edit", "clients.view_all"])).toBe(
      false
    );
  });

  it("nega lista vazia", () => {
    expect(canCreateExtraDemand([])).toBe(false);
  });
});
