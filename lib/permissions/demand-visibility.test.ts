import { describe, expect, it } from "vitest";
import { buildDemandVisibilityWhere } from "./demand-visibility";
import type { SessionUser } from "@/types/auth";

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

describe("buildDemandVisibilityWhere", () => {
  it("gestão vê tudo", () => {
    const where = buildDemandVisibilityWhere(
      user({ id: "g", userType: "MANAGEMENT", permissions: ["clients.view_all"] })
    );
    expect(where).toEqual({});
  });

  it("admin vê tudo", () => {
    const where = buildDemandVisibilityWhere(
      user({ id: "a", userType: "ADMIN", permissions: ["clients.view_all"] })
    );
    expect(where).toEqual({});
  });

  it("colaborador só assignee ou requester", () => {
    const where = buildDemandVisibilityWhere(
      user({
        id: "b",
        userType: "DESIGNER",
        permissions: ["clients.view_assigned"],
        clientIds: ["c1"],
      })
    );
    expect(where).toEqual({
      OR: [{ assigneeId: "b" }, { requesterId: "b" }],
    });
  });

  it("líder vê setor liderado ∪ próprias ∪ pessoas do setor", () => {
    const where = buildDemandVisibilityWhere(
      user({
        id: "m",
        userType: "DESIGNER",
        permissions: ["clients.view_assigned"],
      }),
      { ledSectorIds: ["sec-design"] }
    );
    expect(where).toEqual({
      OR: [
        { sectorId: { in: ["sec-design"] } },
        { assigneeId: "m" },
        { requesterId: "m" },
        { assignee: { sectorId: { in: ["sec-design"] } } },
        { requester: { sectorId: { in: ["sec-design"] } } },
      ],
    });
  });
});
