import {
  AssignmentStatus,
  DemandStatus,
  DemandType,
  UserType,
  WorkSessionStatus,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findDemand = vi.fn();
const findUser = vi.fn();
const createDemand = vi.fn();
const updateDemand = vi.fn();
const deleteDemand = vi.fn();
const findAssignment = vi.fn();
const updateAssignment = vi.fn();
const updateManySessions = vi.fn();
const findWorkSession = vi.fn();
const createChecklist = vi.fn();
const updateChecklist = vi.fn();
const deleteChecklist = vi.fn();
const aggregateChecklist = vi.fn();
const findManyChecklists = vi.fn();
const findChecklist = vi.fn();
const createChecklistItem = vi.fn();
const updateChecklistItem = vi.fn();
const deleteChecklistItemRow = vi.fn();
const findChecklistItem = vi.fn();
const aggregateChecklistItem = vi.fn();
const findManyChecklistItems = vi.fn();
const assignDemand = vi.fn();
const distributeDemandToSector = vi.fn();
const resolveDelayOnTerminalStatus = vi.fn();
const recalculateSectorPriorities = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    demand: {
      findUnique: (...args: unknown[]) => findDemand(...args),
      findUniqueOrThrow: (...args: unknown[]) => findDemand(...args),
      create: (...args: unknown[]) => createDemand(...args),
      update: (...args: unknown[]) => updateDemand(...args),
      delete: (...args: unknown[]) => deleteDemand(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => findUser(...args),
    },
    demandAssignment: {
      findFirst: (...args: unknown[]) => findAssignment(...args),
      update: (...args: unknown[]) => updateAssignment(...args),
    },
    workSession: {
      findFirst: (...args: unknown[]) => findWorkSession(...args),
      updateMany: (...args: unknown[]) => updateManySessions(...args),
    },
    checklist: {
      create: (...args: unknown[]) => createChecklist(...args),
      update: (...args: unknown[]) => updateChecklist(...args),
      delete: (...args: unknown[]) => deleteChecklist(...args),
      findUnique: (...args: unknown[]) => findChecklist(...args),
      findMany: (...args: unknown[]) => findManyChecklists(...args),
      aggregate: (...args: unknown[]) => aggregateChecklist(...args),
    },
    checklistItem: {
      create: (...args: unknown[]) => createChecklistItem(...args),
      update: (...args: unknown[]) => updateChecklistItem(...args),
      delete: (...args: unknown[]) => deleteChecklistItemRow(...args),
      findUnique: (...args: unknown[]) => findChecklistItem(...args),
      findMany: (...args: unknown[]) => findManyChecklistItems(...args),
      aggregate: (...args: unknown[]) => aggregateChecklistItem(...args),
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

const parentDemand = {
  id: "parent-1",
  clientId: "cli-1",
  boardId: "board-1",
  competenceId: "comp-1",
  type: DemandType.FEED,
  origin: "CLIENT_BOARD",
  isChecklistItem: false,
  status: DemandStatus.PUBLISHED,
};

describe("addChecklistItem (leve)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findChecklist.mockResolvedValue({
      id: "cl-1",
      demandId: "parent-1",
      title: "Checklist",
      demand: parentDemand,
    });
    findDemand.mockResolvedValue(parentDemand);
    aggregateChecklistItem.mockResolvedValue({ _max: { sortOrder: 0 } });
    createChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      isDone: false,
      sortOrder: 1,
      assigneeId: null,
      dueDate: null,
      linkedDemandId: null,
    });
  });

  it("cria item leve e não chama demand.create", async () => {
    const { addChecklistItem } = await import("./checklist.service");

    const item = await addChecklistItem(actor, "cl-1", "Revisar copy");

    expect(createDemand).not.toHaveBeenCalled();
    expect(createChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Revisar copy",
          sortOrder: 1,
          checklistId: "cl-1",
        }),
      })
    );
    expect(item.linkedDemandId).toBeNull();
  });
});

describe("assignChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      isDone: false,
      linkedDemandId: null,
      assigneeId: null,
      checklist: {
        id: "cl-1",
        demandId: "parent-1",
        demand: parentDemand,
      },
    });
    findDemand.mockResolvedValue(parentDemand);
    findUser.mockResolvedValue({ id: "traf-1", sectorId: "sec-traf" });
    createDemand.mockResolvedValue({ id: "child-1", title: "Revisar copy" });
    assignDemand.mockResolvedValue({});
    updateChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      linkedDemandId: "child-1",
      assigneeId: "traf-1",
      isDone: false,
    });
  });

  it("cria Demand filha e seta linkedDemandId", async () => {
    const { assignChecklistItem } = await import("./checklist.service");

    const item = await assignChecklistItem(actor, "item-1", "traf-1");

    expect(createDemand).toHaveBeenCalled();
    const created = createDemand.mock.calls[0][0].data;
    expect(created.isChecklistItem).toBe(true);
    expect(created.parentDemand.connect.id).toBe("parent-1");
    expect(assignDemand).toHaveBeenCalledWith(
      "child-1",
      "traf-1",
      actor,
      expect.anything()
    );
    expect(updateChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          linkedDemandId: "child-1",
          assigneeId: "traf-1",
        }),
      })
    );
    expect(item.linkedDemandId).toBe("child-1");
  });
});

describe("toggleChecklistItemDone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sem link só atualiza isDone do item", async () => {
    findChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      isDone: false,
      linkedDemandId: null,
      assigneeId: null,
      checklist: {
        id: "cl-1",
        demandId: "parent-1",
        demand: parentDemand,
      },
    });
    findDemand.mockResolvedValue(parentDemand);
    updateChecklistItem.mockResolvedValue({
      id: "item-1",
      isDone: true,
      linkedDemandId: null,
    });

    const { toggleChecklistItemDone } = await import("./checklist.service");

    await toggleChecklistItemDone(actor, "item-1", true);

    expect(updateDemand).not.toHaveBeenCalled();
    expect(updateChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({ isDone: true }),
      })
    );
  });
});

describe("deleteChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      linkedDemandId: "child-1",
      checklist: {
        id: "cl-1",
        demandId: "parent-1",
        demand: parentDemand,
      },
    });
    findDemand.mockResolvedValue(parentDemand);
  });

  it("bloqueia delete quando há sessão ACTIVE/PAUSED", async () => {
    findWorkSession.mockResolvedValue({
      id: "ws-1",
      status: WorkSessionStatus.ACTIVE,
    });

    const { deleteChecklistItem } = await import("./checklist.service");

    await expect(deleteChecklistItem(actor, "item-1")).rejects.toThrow(
      /sessão|produção|ativa/i
    );
    expect(deleteDemand).not.toHaveBeenCalled();
    expect(deleteChecklistItemRow).not.toHaveBeenCalled();
  });
});

describe("completeChecklistItem (compat)", () => {
  beforeEach(() => {
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

  it("marca demanda e atribuição como concluídas", async () => {
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
          productionCompletedAt: expect.any(Date),
        }),
      })
    );
    expect(resolveDelayOnTerminalStatus).toHaveBeenCalledWith("child-1", "DONE");
  });
});
