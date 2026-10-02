// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncementsManager, announcementStatus } from "./announcements-manager";

const create = vi.fn().mockResolvedValue({ id: "new1" });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/actions/announcements", () => ({
  createAnnouncement: (...a: unknown[]) => create(...a),
  deleteAnnouncement: vi.fn(),
  toggleAnnouncement: vi.fn(),
}));

afterEach(() => {
  cleanup();
  create.mockClear();
});

describe("AnnouncementsManager", () => {
  it("mostra o formulário e a pré-visualização ao vivo", () => {
    render(<AnnouncementsManager initialItems={[]} />);
    expect(screen.getByText("Novo aviso")).toBeTruthy();
    expect(screen.getByText("Como vai aparecer")).toBeTruthy();
    expect(screen.getAllByText("Título do aviso").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Reunião às 16h" } });
    expect(screen.getAllByText("Reunião às 16h").length).toBeGreaterThan(0);
  });

  it("urgente explica que fica até clicar e que não é erro do sistema", () => {
    render(<AnnouncementsManager initialItems={[]} />);
    fireEvent.click(screen.getByRole("radio", { name: "Urgente" }));
    expect(screen.getByText(/Não é um erro do sistema/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entendi" })).toBeTruthy();
  });

  it("datas só aparecem ao escolher agendar / definir data", () => {
    render(<AnnouncementsManager initialItems={[]} />);
    expect(screen.queryByLabelText("Data e hora de início")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Agendar" }));
    expect(screen.getByLabelText("Data e hora de início")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Definir data" }));
    expect(screen.getByLabelText("Data e hora de término")).toBeTruthy();
  });

  it("publicar agora não envia datas", async () => {
    render(<AnnouncementsManager initialItems={[]} />);
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Aviso" } });
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Texto" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar aviso" }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Aviso", startsAt: undefined, endsAt: undefined })
    );
  });
});

describe("announcementStatus", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const base = { startsAt: "2026-10-01T00:00:00Z", endsAt: null as string | null, active: true };
  it("deriva o status", () => {
    expect(announcementStatus(base, now)).toBe("Ativo");
    expect(announcementStatus({ ...base, active: false }, now)).toBe("Inativo");
    expect(announcementStatus({ ...base, startsAt: "2026-10-05T00:00:00Z" }, now)).toBe("Agendado");
    expect(announcementStatus({ ...base, endsAt: "2026-10-01T10:00:00Z" }, now)).toBe("Expirado");
  });
});
