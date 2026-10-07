import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/types/auth";
import { demandSearchWhere } from "./search.service";

function user(partial: Partial<SessionUser> & Pick<SessionUser, "id" | "userType" | "permissions">): SessionUser {
  return {
    name: "t",
    email: "t@t.com",
    roleId: "r",
    roleName: "r",
    status: "ACTIVE",
    sectorId: null,
    clientIds: [],
    mustResetPassword: false,
    ...partial,
  } as SessionUser;
}

describe("demandSearchWhere", () => {
  it("colaborador sem carteira ainda encontra a demanda que executa", () => {
    const where = demandSearchWhere(
      user({
        id: "bruno",
        userType: "VIDEO_EDITOR",
        permissions: ["clients.view_assigned"],
        clientIds: [],
      }),
      "QA-ROTINA",
      []
    );
    expect(where).toEqual({
      AND: [
        { OR: [{ assigneeId: "bruno" }, { requesterId: "bruno" }] },
        {
          OR: [
            { title: { contains: "QA-ROTINA", mode: "insensitive" } },
            { description: { contains: "QA-ROTINA", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("gestão busca em todas as demandas", () => {
    const where = demandSearchWhere(
      user({
        id: "ana",
        userType: "MANAGEMENT",
        permissions: ["clients.view_all"],
      }),
      "reels",
      []
    );
    expect(where).toEqual({
      AND: [
        {},
        {
          OR: [
            { title: { contains: "reels", mode: "insensitive" } },
            { description: { contains: "reels", mode: "insensitive" } },
          ],
        },
      ],
    });
  });
});
