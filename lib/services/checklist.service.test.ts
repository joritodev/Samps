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
const updateManyChecklistItems = vi.fn();
const transaction = vi.fn();
const createComment = vi.fn();
const findPriority = vi.fn();
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
      updateMany: (...args: unknown[]) => updateManyChecklistItems(...args),
      delete: (...args: unknown[]) => deleteChecklistItemRow(...args),
      findUnique: (...args: unknown[]) => findChecklistItem(...args),
      findMany: (...args: unknown[]) => findManyChecklistItems(...args),
      aggregate: (...args: unknown[]) => aggregateChecklistItem(...args),
    },
    comment: {
      create: (...args: unknown[]) => createComment(...args),
      findMany: vi.fn(),
    },
    priorityLevel: {
      findFirst: (...args: unknown[]) => findPriority(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
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

describe("addChecklistItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findChecklist.mockResolvedValue({
      id: "cl-1",
      demandId: "parent-1",
      title: "Planejamento",
      demand: parentDemand,
    });
    findDemand.mockResolvedValue(parentDemand);
    aggregateChecklistItem.mockResolvedValue({ _max: { sortOrder: 0 } });
    createDemand.mockResolvedValue({ id: "child-1" });
    createChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      isDone: false,
      sortOrder: 1,
      assigneeId: null,
      dueDate: null,
      linkedDemandId: "child-1",
    });
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        demand: { create: (...args: unknown[]) => createDemand(...args) },
        checklistItem: {
          create: (...args: unknown[]) => createChecklistItem(...args),
        },
      })
    );
  });

  it("cria demanda filha aberta na mesma transação, sem responsável", async () => {
    const { addChecklistItem } = await import("./checklist.service");

    const item = await addChecklistItem(actor, "cl-1", "Revisar copy");

    expect(createDemand).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Revisar copy",
          description: "",
          isChecklistItem: true,
          status: DemandStatus.OPEN,
          parentDemand: { connect: { id: "parent-1" } },
        }),
      })
    );
    expect(createDemand.mock.calls[0]?.[0].data.assignee).toBeUndefined();
    expect(createChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Revisar copy",
          sortOrder: 1,
          checklistId: "cl-1",
          linkedDemandId: "child-1",
        }),
      })
    );
    expect(item.linkedDemandId).toBe("child-1");
  });
});

describe("addChecklistComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findChecklist.mockResolvedValue({
      id: "cl-1",
      demand: { id: "parent-1", clientId: "cli-1" },
    });
    createComment.mockResolvedValue({
      id: "c-1",
      text: "Falta o prazo",
      user: { id: "admin-1", name: "Admin" },
    });
  });

  it("grava no pai com entityType Checklist", async () => {
    const { addChecklistComment } = await import("./checklist.service");

    await addChecklistComment(actor, "cl-1", "  Falta o prazo  ");

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          demandId: "parent-1",
          entityType: "Checklist",
          entityId: "cl-1",
          text: "Falta o prazo",
          userId: "admin-1",
        }),
      })
    );
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

  it("com link: assignee sem demands.edit pode concluir", async () => {
    const assignee = {
      ...actor,
      id: "traf-1",
      permissions: [] as string[],
    };
    findChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      isDone: false,
      linkedDemandId: "child-1",
      assigneeId: "traf-1",
      checklist: {
        id: "cl-1",
        demandId: "parent-1",
        demand: parentDemand,
      },
    });
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
    updateChecklistItem.mockResolvedValue({
      id: "item-1",
      isDone: true,
      linkedDemandId: "child-1",
    });
    updateManyChecklistItems.mockResolvedValue({ count: 1 });

    const { toggleChecklistItemDone } = await import("./checklist.service");

    await toggleChecklistItemDone(assignee, "item-1", true);

    expect(updateDemand).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "child-1" },
        data: expect.objectContaining({ status: DemandStatus.DONE }),
      })
    );
    expect(updateManyChecklistItems).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { linkedDemandId: "child-1" },
        data: { isDone: true },
      })
    );
    expect(updateChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDone: true }),
      })
    );
  });

  it("com link: reopen (isDone false) — assignee sem demands.edit pode reabrir", async () => {
    const assignee = {
      ...actor,
      id: "traf-1",
      permissions: [] as string[],
    };
    findChecklistItem.mockResolvedValue({
      id: "item-1",
      checklistId: "cl-1",
      title: "Revisar copy",
      isDone: true,
      linkedDemandId: "child-1",
      assigneeId: "traf-1",
      checklist: {
        id: "cl-1",
        demandId: "parent-1",
        demand: parentDemand,
      },
    });
    // assertCanActOnLinkedDemand then reopenLinkedDemand both findUnique
    findDemand
      .mockResolvedValueOnce({
        id: "child-1",
        clientId: "cli-1",
        assigneeId: "traf-1",
        isChecklistItem: true,
        sector: { leaderId: "leader-1" },
      })
      .mockResolvedValueOnce({
        id: "child-1",
        assigneeId: "traf-1",
        status: DemandStatus.DONE,
        sectorId: "sec-traf",
      });
    findAssignment.mockResolvedValue({
      id: "asg-1",
      status: AssignmentStatus.DONE,
    });
    updateAssignment.mockResolvedValue({});
    updateDemand.mockResolvedValue({
      id: "child-1",
      status: DemandStatus.DEMANDED,
    });
    updateManyChecklistItems.mockResolvedValue({ count: 1 });
    updateChecklistItem.mockResolvedValue({
      id: "item-1",
      isDone: false,
      linkedDemandId: "child-1",
    });

    const { toggleChecklistItemDone } = await import("./checklist.service");

    await toggleChecklistItemDone(assignee, "item-1", false);

    expect(updateDemand).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "child-1" },
        data: expect.objectContaining({
          status: DemandStatus.DEMANDED,
          productionCompletedAt: null,
        }),
      })
    );
    expect(updateManyChecklistItems).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { linkedDemandId: "child-1" },
        data: { isDone: false },
      })
    );
    expect(updateChecklistItem).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDone: false }),
      })
    );
  });

  it("sem link: sem demands.edit rejeita", async () => {
    const noEdit = { ...actor, permissions: [] as string[] };
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

    const { toggleChecklistItemDone } = await import("./checklist.service");

    await expect(toggleChecklistItemDone(noEdit, "item-1", true)).rejects.toThrow(
      /permissão/i
    );
    expect(updateChecklistItem).not.toHaveBeenCalled();
  });
});

describe("deleteChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findChecklist.mockResolvedValue({
      id: "cl-1",
      demandId: "parent-1",
      title: "Checklist",
      demand: parentDemand,
    });
    findDemand.mockResolvedValue(parentDemand);
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        demand: { delete: (...args: unknown[]) => deleteDemand(...args) },
        checklist: { delete: (...args: unknown[]) => deleteChecklist(...args) },
      };
      return fn(tx);
    });
  });

  it("preflight: se algum linked tem sessão, não deleta nenhum", async () => {
    findManyChecklistItems.mockResolvedValue([
      { id: "item-1", linkedDemandId: "child-1" },
      { id: "item-2", linkedDemandId: "child-2" },
    ]);
    findWorkSession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "ws-2",
        status: WorkSessionStatus.ACTIVE,
      });

    const { deleteChecklist: deleteChecklistFn } = await import(
      "./checklist.service"
    );

    await expect(deleteChecklistFn(actor, "cl-1")).rejects.toThrow(
      /sessão|produção|ativa/i
    );
    expect(deleteDemand).not.toHaveBeenCalled();
    expect(deleteChecklist).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("sem bloqueio: deleta linked + checklist em transaction", async () => {
    findManyChecklistItems.mockResolvedValue([
      { id: "item-1", linkedDemandId: "child-1" },
      { id: "item-2", linkedDemandId: null },
    ]);
    findWorkSession.mockResolvedValue(null);
    deleteDemand.mockResolvedValue({});
    deleteChecklist.mockResolvedValue({});

    const { deleteChecklist: deleteChecklistFn } = await import(
      "./checklist.service"
    );

    await deleteChecklistFn(actor, "cl-1");

    expect(transaction).toHaveBeenCalled();
    expect(deleteDemand).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "child-1" } })
    );
    expect(deleteChecklist).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cl-1" } })
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
    updateManyChecklistItems.mockResolvedValue({ count: 1 });
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
    expect(updateManyChecklistItems).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { linkedDemandId: "child-1" },
        data: { isDone: true },
      })
    );
    expect(resolveDelayOnTerminalStatus).toHaveBeenCalledWith("child-1", "DONE");
  });
});
