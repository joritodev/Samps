import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache antes de importar o módulo
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { revalidateOperationalViews } from "./revalidate-operational";

describe("revalidateOperationalViews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("chama revalidatePath para cada rota agency", () => {
    revalidateOperationalViews();

    const calls = (revalidatePath as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0]
    );

    // Agency (live shell) — (agency) route group
    expect(calls).toContain("/setores");
    expect(calls).toContain("/setores/design");
    expect(calls).toContain("/setores/video");
    expect(calls).toContain("/setores/trafego");
    expect(calls).toContain("/setores/social");
    expect(calls).toContain("/meu-painel/design");
    expect(calls).toContain("/meu-painel/video");
    expect(calls).toContain("/meu-painel/trafego");
    expect(calls).toContain("/meu-painel/social");
    expect(calls).toContain("/painel-gestao");
    expect(calls).toContain("/demandas");
    expect(calls).toContain("/notificacoes");

    // Rotas legacy não devem mais estar presentes — agora são redirects 308
    expect(calls).not.toContain("/quadros/design");
    expect(calls).not.toContain("/quadros/video");
    expect(calls).not.toContain("/quadros/trafego");
    expect(calls).not.toContain("/quadros/social-media");
    expect(calls).not.toContain("/painel/design");
    expect(calls).not.toContain("/painel/video");
    expect(calls).not.toContain("/painel/social-media");
    expect(calls).not.toContain("/gestao");
  });

  it("não revalida o quadro do cliente quando clientId não é fornecido", () => {
    revalidateOperationalViews();

    const calls = (revalidatePath as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0] as string
    );
    const clientCalls = calls.filter((p) => p.startsWith("/clientes/"));
    expect(clientCalls).toHaveLength(0);
  });

  it("revalida o quadro do cliente quando clientId é fornecido", () => {
    revalidateOperationalViews("client-123");

    const calls = (revalidatePath as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0]
    );
    expect(calls).toContain("/clientes/client-123/quadro");
  });
});
