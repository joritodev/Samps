import { afterEach, describe, expect, it } from "vitest";
import { rejectUnlessCron } from "./auth";

const req = (authorization?: string) =>
  new Request("http://localhost/api/cron/x", { headers: authorization ? { authorization } : {} });

describe("rejectUnlessCron", () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("503 sem CRON_SECRET: nunca roda aberto", async () => {
    delete process.env.CRON_SECRET;
    const res = rejectUnlessCron(req("Bearer qualquer"));
    expect(res?.status).toBe(503);
  });
  it("401 sem cabeçalho, com segredo errado e com tamanho diferente", () => {
    process.env.CRON_SECRET = "segredo-longo";
    expect(rejectUnlessCron(req())?.status).toBe(401);
    expect(rejectUnlessCron(req("Bearer errado-errado"))?.status).toBe(401);
    expect(rejectUnlessCron(req("Bearer x"))?.status).toBe(401);
    expect(rejectUnlessCron(req("segredo-longo"))?.status).toBe(401);
  });
  it("segredo certo segue", () => {
    process.env.CRON_SECRET = "segredo-longo";
    expect(rejectUnlessCron(req("Bearer segredo-longo"))).toBeNull();
  });
});
