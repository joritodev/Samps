import { AssignmentStatus, DemandStatus, DemandType, UserType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findDemand = vi.fn();
const findUser = vi.fn();
const aggregateDemand = vi.fn();
const createDemand = vi.fn();
const updateDemand = vi.fn();
const findAssignment = vi.fn();
const updateAssignment = vi.fn();
const updateManySessions = vi.fn();
const assignDemand = vi.fn();
const distributeDemandToSector = vi.fn();
const resolveDelayOnTerminalStatus = vi.fn();
const recalculateSectorPriorities = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    demand: {
      findUnique: (...args: unknown[]) => findDemand(...args),
      findUniqueOrThrow: (...args: unknown[]) => findDemand(...args),
      aggregate: (...args: unknown[]) => aggregateDemand(...args),
      create: (...args: unknown[]) => createDemand(...args),
      update: (...args: unknown[]) => updateDemand(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => findUser(...args),
    },
    demandAssignment: {
      findFirst: (...args: unknown[]) => findAssignment(...args),
      update: (...args: unknown[]) => updateAssignment(...args),
    },
    workSession: {
      updateMany: (...args: unknown[]) => updateManySessions(...args),
    },
  },
}));

vi.mock("@/lib/permissions/resolve", () => ({
  hasPermission: (perms: string[], code: string) => perms.includes(code),
  canAccessClient: () => true,
}));

vi.mock("@/lib/services/assignment.service", () => ({
  assignDemand: (...args: unknown[]) => assignDemand(...args),
}));

vi.mock("@/lib/services/distribution.service", () => ({
  distributeDemandToSector: (...args: unknown[]) =>
    distributeDemandToSector(...args),
}));

vi.mock("@/lib/services/deadline.service", () => ({
  resolveDelayOnTerminalStatus: (...args: unknown[]) =>
    resolveDelayOnTerminalStatus(...args),
}));

vi.mock("@/lib/services/priority.service", () => ({
  recalculateSectorPriorities: (...args: unknown[]) =>
    recalculateSectorPriorities(...args),
}));

const actor = {
  id: "admin-1",
  email: "admin@samps.digital",
  name: "Admin",
  userType: UserType.ADMIN,
  roleId: "r1",
  roleName: "Admin",
  status: "ACTIVE",
  mustResetPassword: false,
  permissions: ["demands.edit", "demands.assign"],
  clientIds: ["cli-1"],
};

describe("addChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findDemand.mockResolvedValue({
      id: "parent-1",
      clientId: "cli-1",
      boardId: "board-1",
      competenceId: "comp-1",
      type: DemandType.FEED,
      origin: "CLIENT_BOARD",
      isChecklistItem: false,
      status: DemandStatus.PUBLISHED,
    });
    findUser.mockResolvedValue({ id: "traf-1", sectorId: "sec-traf" });
    aggregateDemand.mockResolvedValue({ _max: { checklistOrder: 0 } });
    createDemand.mockResolvedValue({ id: "child-1" });
    findDemand
      .mockResolvedValueOnce({
        id: "parent-1",
        clientId: "cli-1",
        boardId: "board-1",
        competenceId: "comp-1",
        type: DemandType.FEED,
        origin: "CLIENT_BOARD",
        isChecklistItem: false,
        status: DemandStatus.PUBLISHED,
      })
      .mockResolvedValue({
        id: "child-1",
        title: "Criar conjunto de anúncios",
        assignee: { id: "traf-1", name: "Rafael Alves" },
        sector: { id: "sec-traf", name: "Tráfego" },
      });
  });

  it("ao demandar para alguém, distribui como AVAILABLE e não ASSIGNED", async () => {
    const { addChecklistItem } = await import("./checklist.service");

    await addChecklistItem(actor, "parent-1", {
      title: "Criar conjunto de anúncios",
      description: "Variações Meta Ads 1:1 e 9:16",
      format: "Feed",
      assigneeId: "traf-1",
    });

    expect(createDemand).toHaveBeenCalled();
    const created = createDemand.mock.calls[0][0].data;
    expect(created.description).toBe("Variações Meta Ads 1:1 e 9:16");
    expect(created.format).toBe("Feed");
    expect(created.status).toBe(DemandStatus.DEMANDED);
    expect(created.boardColumn).toBe("available");
    expect(created.internalStatus).toBe("Disponível no setor");
    expect(assignDemand).not.toHaveBeenCalled();
    expect(distributeDemandToSector).toHaveBeenCalledWith(
      expect.objectContaining({
        demandId: "child-1",
        sectorId: "sec-traf",
        title: "Criar conjunto de anúncios",
      })
    );
  });
});

describe("completeChecklistItem", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    findDemand.mockResolvedValue({
      id: "child-1",
      clientId: "cli-1",
      assigneeId: "traf-1",
      isChecklistItem: true,
      status: DemandStatus.DEMANDED,
      sectorId: "sec-traf",
      sector: { leaderId: "leader-1" },
    });
    findAssignment.mockResolvedValue({
      id: "asg-1",
      status: AssignmentStatus.ASSIGNED,
    });
    updateManySessions.mockResolvedValue({ count: 0 });
    updateAssignment.mockResolvedValue({});
    updateDemand.mockResolvedValue({
      id: "child-1",
      status: DemandStatus.DONE,
      assignee: null,
      sector: null,
    });
  });

  it("marca a demanda e a atribuição como concluídas", async () => {
    const { completeChecklistItem } = await import("./checklist.service");

    await completeChecklistItem(actor, "child-1");

    expect(updateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "asg-1" },
        data: expect.objectContaining({ status: AssignmentStatus.DONE }),
      })
    );
    expect(updateDemand).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "child-1" },
        data: expect.objectContaining({
          status: DemandStatus.DONE,
          internalStatus: "Concluída",
          boardColumn: "done",
          productionCompletedAt: expect.any(Date),
        }),
      })
    );
    expect(resolveDelayOnTerminalStatus).toHaveBeenCalledWith("child-1", "DONE");
  });

  it("permite o líder do setor concluir o item", async () => {
    const { completeChecklistItem } = await import("./checklist.service");
    const leader = {
      ...actor,
      id: "leader-1",
      permissions: [] as string[],
    };

    await expect(completeChecklistItem(leader, "child-1")).resolves.toBeTruthy();
  });

  it("conclui item ainda em Disponíveis (assignment AVAILABLE)", async () => {
    findAssignment.mockResolvedValue({
      id: "asg-avail",
      status: AssignmentStatus.AVAILABLE,
    });
    const { completeChecklistItem } = await import("./checklist.service");

    await completeChecklistItem(actor, "child-1");

    expect(updateAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "asg-avail" },
        data: expect.objectContaining({ status: AssignmentStatus.DONE }),
      })
    );
  });
});
