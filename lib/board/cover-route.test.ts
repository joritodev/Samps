import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.fn();
const uploadBoardCover = vi.fn();
vi.mock("@/lib/permissions/check", () => ({ getSessionUser: () => getSessionUser() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/services/board-cover.service", () => ({
  CoverError: class CoverError extends Error {
    status = 400;
  },
  uploadBoardCover: (...a: unknown[]) => uploadBoardCover(...a),
  removeBoardCover: vi.fn(),
}));

import { POST } from "@/app/api/clientes/[clientId]/quadro/capa/route";

const url = "http://localhost:3000/api/clientes/c1/quadro/capa";
function req(opts: { origin?: string | null; file?: boolean } = {}) {
  const form = new FormData();
  if (opts.file !== false) form.set("file", new File([new Uint8Array([1, 2, 3])], "a.jpg"));
  form.set("x", "0");
  const headers: Record<string, string> = {};
  if (opts.origin !== null) headers.origin = opts.origin ?? "http://localhost:3000";
  return new Request(url, { method: "POST", body: form, headers });
}
const ctx = { params: { clientId: "c1" } };
const editor = { id: "u1", permissions: ["clients.edit", "clients.view_all"], clientIds: [] };

describe("POST capa do quadro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadBoardCover.mockResolvedValue({ url: "x", w: 2400, h: 200 });
  });
  it("recusa origem diferente ou ausente", async () => {
    getSessionUser.mockResolvedValue(editor);
    expect((await POST(req({ origin: "https://evil.com" }), ctx)).status).toBe(403);
    expect((await POST(req({ origin: null }), ctx)).status).toBe(403);
    expect(uploadBoardCover).not.toHaveBeenCalled();
  });
  it("exige login", async () => {
    getSessionUser.mockResolvedValue(null);
    expect((await POST(req(), ctx)).status).toBe(401);
  });
  it("exige clients.edit", async () => {
    getSessionUser.mockResolvedValue({ ...editor, permissions: ["clients.view_all"] });
    expect((await POST(req(), ctx)).status).toBe(403);
  });
  it("exige acesso ao cliente", async () => {
    getSessionUser.mockResolvedValue({ ...editor, permissions: ["clients.edit"] });
    expect((await POST(req(), ctx)).status).toBe(403);
  });
  it("exige arquivo", async () => {
    getSessionUser.mockResolvedValue(editor);
    expect((await POST(req({ file: false }), ctx)).status).toBe(400);
  });
  it("aceita editor com acesso", async () => {
    getSessionUser.mockResolvedValue(editor);
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(uploadBoardCover).toHaveBeenCalledOnce();
  });
});
