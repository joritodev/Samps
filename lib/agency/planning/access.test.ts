import { UserType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PLANNING_FORBIDDEN, assertPlanning, planningAccess } from "./access";

const user = (userType: UserType, permissions: string[]) => ({ userType, permissions });

describe("planningAccess", () => {
  it("gestor com manage vê, edita e gerencia", () => {
    expect(planningAccess(user(UserType.MANAGEMENT, ["planning.manage"]))).toEqual({
      canView: true,
      canEdit: true,
      canManage: true,
    });
  });
  it("edit implica view; view sozinho só vê", () => {
    expect(planningAccess(user(UserType.DESIGNER, ["planning.edit"]))).toEqual({
      canView: true,
      canEdit: true,
      canManage: false,
    });
    expect(planningAccess(user(UserType.DESIGNER, ["planning.view"]))).toEqual({
      canView: true,
      canEdit: false,
      canManage: false,
    });
  });
  it("sem permissão não tem nada", () => {
    expect(planningAccess(user(UserType.DESIGNER, ["demands.edit"]))).toEqual({
      canView: false,
      canEdit: false,
      canManage: false,
    });
  });
  it("cliente externo nunca acessa, nem com as permissões", () => {
    expect(
      planningAccess(
        user(UserType.EXTERNAL_CLIENT, ["planning.view", "planning.edit", "planning.manage"]),
      ),
    ).toEqual({ canView: false, canEdit: false, canManage: false });
  });
});

describe("assertPlanning", () => {
  it("lança a mensagem genérica quando falta o nível", () => {
    expect(() => assertPlanning(user(UserType.DESIGNER, ["planning.view"]), "edit")).toThrow(
      PLANNING_FORBIDDEN,
    );
    expect(() => assertPlanning(user(UserType.DESIGNER, ["planning.edit"]), "manage")).toThrow(
      PLANNING_FORBIDDEN,
    );
  });
  it("devolve o acesso quando passa", () => {
    expect(assertPlanning(user(UserType.DESIGNER, ["planning.edit"]), "edit").canEdit).toBe(true);
  });
});
