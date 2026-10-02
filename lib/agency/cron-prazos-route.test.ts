import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.fn();
const digest = vi.fn();
vi.mock("@/lib/services/deadline-notifications.service", () => ({
  runDeadlineNotifications: () => run(),
  runUnassignedOverdueDigest: () => digest(),
}));

import { GET } from "@/app/api/cron/prazos/route";

const req = (auth?: string) =>
  new Request("http://localhost/api/cron/prazos", { headers: auth ? { authorization: auth } : {} });

const original = process.env.CRON_SECRET;
beforeEach(() => {
  vi.clearAllMocks();
  run.mockResolvedValue({ considered: 3, planned: 2, created: 2, skippedDuplicates: 0, skippedByPreference: 0 });
  digest.mockResolvedValue({ considered: 4, planned: 1, created: 1, skippedDuplicates: 0, skippedByPreference: 0 });
});
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe("GET /api/cron/prazos", () => {
  it("fica fechado (503) sem CRON_SECRET", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer qualquer"));
    expect(res.status).toBe(503);
    expect(run).not.toHaveBeenCalled();
  });

  it("recusa sem cabeçalho, com segredo errado ou de outro tamanho", async () => {
    process.env.CRON_SECRET = "segredo-longo-123";
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer errado"))).status).toBe(401);
    expect((await GET(req("Bearer segredo-longo-124"))).status).toBe(401);
    expect((await GET(req("segredo-longo-123"))).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    expect(digest).not.toHaveBeenCalled();
  });

  it("roda com o segredo certo e devolve as contagens", async () => {
    process.env.CRON_SECRET = "segredo-longo-123";
    const res = await GET(req("Bearer segredo-longo-123"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      prazos: { created: 2 },
      gestao: { created: 1 },
    });
    expect(run).toHaveBeenCalledOnce();
    expect(digest).toHaveBeenCalledOnce();
  });

  it("se o resumo da gestão falhar, os avisos de prazo ainda saem (e responde 500)", async () => {
    process.env.CRON_SECRET = "segredo-longo-123";
    digest.mockRejectedValue(new Error("falha"));
    const res = await GET(req("Bearer segredo-longo-123"));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.prazos).toMatchObject({ created: 2 });
    expect(body.gestao).toEqual({ error: "falhou" });
  });

  it("não vaza detalhe do erro", async () => {
    process.env.CRON_SECRET = "segredo-longo-123";
    run.mockRejectedValue(new Error("senha do banco: x"));
    const res = await GET(req("Bearer segredo-longo-123"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("senha");
  });
});
