import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuth = vi.fn();
const addCardComment = vi.fn();
const findUnique = vi.fn();
const findBoardList = vi.fn();
const updateDemandListAndOrder = vi.fn();
const notifyCommentMentions = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/permissions/check", () => ({
  requireAuth: () => requireAuth(),
}));

vi.mock("@/lib/permissions/resolve", () => ({
  hasPermission: vi.fn(),
  canAccessClient: vi.fn(() => true),
}));

vi.mock("@/lib/revalidate-operational", () => ({
  revalidateOperationalViews: vi.fn(),
}));

vi.mock("@/lib/services/cards.service", () => ({
  addCardComment: (...args: unknown[]) => addCardComment(...args),
  completeBriefingAndDemand: vi.fn(),
  completeProductionAndReview: vi.fn(),
  getCardById: vi.fn(),
  registerPublicationAndComplete: vi.fn(),
  updateCardVisibility: vi.fn(),
  updateDemandListAndOrder: (...args: unknown[]) =>
    updateDemandListAndOrder(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    demand: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
    boardList: {
      findFirst: (...args: unknown[]) => findBoardList(...args),
    },
  },
}));

vi.mock("@/lib/services/mentions.service", () => ({
  notifyCommentMentions: (...args: unknown[]) => notifyCommentMentions(...args),
}));

describe("addCommentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ id: "author-1", name: "Ana" });
    addCardComment.mockResolvedValue({ id: "c1" });
    findUnique.mockResolvedValue({ title: "Campanha X", clientId: "cli-1" });
    notifyCommentMentions.mockResolvedValue(undefined);
  });

  it("notifica mencoes apos criar o comentario, com titulo e clientId da demanda", async () => {
    const { addCommentAction } = await import("./cards.actions");

    await addCommentAction("demand-1", "cli-fallback", "Oi @Maria");

    expect(addCardComment).toHaveBeenCalledWith(
      "demand-1",
      "author-1",
      "Oi @Maria",
      undefined
    );
    expect(notifyCommentMentions).toHaveBeenCalledWith({
      text: "Oi @Maria",
      authorUserId: "author-1",
      authorName: "Ana",
      demandTitle: "Campanha X",
      clientId: "cli-1",
      demandId: "demand-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/clientes/cli-fallback/quadro");
  });
});

describe("moveCardAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue({ id: "u1" });
    updateDemandListAndOrder.mockResolvedValue({});
  });

  it("recusa coluna que nao pertence ao cliente", async () => {
    findBoardList.mockResolvedValue(null);
    const { moveCardAction } = await import("./cards.actions");

    const result = await moveCardAction("d1", "cli-1", "list-other", 0);

    expect(result).toEqual({
      error: "Coluna não encontrada para este cliente",
    });
    expect(updateDemandListAndOrder).not.toHaveBeenCalled();
  });

  it("persiste a coluna quando a lista e do cliente", async () => {
    findBoardList.mockResolvedValue({ id: "list-1" });
    const { moveCardAction } = await import("./cards.actions");

    const result = await moveCardAction("d1", "cli-1", "list-1", 0);

    expect(result).toEqual({ success: true });
    expect(updateDemandListAndOrder).toHaveBeenCalledWith("d1", "list-1", 0);
    expect(revalidatePath).toHaveBeenCalledWith("/clientes/cli-1/quadro");
  });
});
