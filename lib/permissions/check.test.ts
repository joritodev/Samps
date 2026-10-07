import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const findUser = vi.fn();

vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: (...a: unknown[]) => findUser(...a) } } }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("./resolve", () => ({
  canAccessClient: vi.fn(),
  hasAnyPermission: vi.fn(),
  hasPermission: vi.fn(),
  resolveUserPermissions: vi.fn(async () => ["demands.edit"]),
  resolveUserClientIds: vi.fn(async () => ["c1"]),
}));

describe("sessão", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "u1", userType: "DESIGNER" } });
  });

  it("conta ativa: devolve o usuário com permissões e clientes relidos do banco", async () => {
    findUser.mockResolvedValue({ status: "ACTIVE" });
    const { getSessionUser } = await import("./check");
    const user = await getSessionUser();
    expect(user).toMatchObject({ id: "u1", permissions: ["demands.edit"], clientIds: ["c1"] });
  });

  it.each(["INACTIVE", "BLOCKED", "AWAY", "INVITE_PENDING"])(
    "conta %s: a sessão deixa de valer na hora",
    async (status) => {
      findUser.mockResolvedValue({ status });
      const { getSessionUser, requireAuth } = await import("./check");
      expect(await getSessionUser()).toBeNull();
      // vai para /sair (encerra o cookie), não para /login, que o middleware devolveria à home
      await expect(requireAuth()).rejects.toThrow("REDIRECT:/sair");
    }
  );

  it("usuário apagado do banco também perde a sessão", async () => {
    findUser.mockResolvedValue(null);
    const { requireAuth } = await import("./check");
    await expect(requireAuth()).rejects.toThrow("REDIRECT:/sair");
  });

  it("sem sessão: vai para /login", async () => {
    auth.mockResolvedValue(null);
    const { getSessionUser, requireAuth } = await import("./check");
    expect(await getSessionUser()).toBeNull();
    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
  });
});
