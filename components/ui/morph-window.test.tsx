// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MorphWindow } from "./morph-window";

type FakeAnim = {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  onfinish: (() => void) | null;
  cancel: ReturnType<typeof vi.fn>;
  reverse: ReturnType<typeof vi.fn>;
  finish: () => void;
};

let anims: FakeAnim[] = [];

function installAnimate() {
  anims = [];
  Element.prototype.animate = vi.fn(function (keyframes: Keyframe[], options: KeyframeAnimationOptions) {
    const a: FakeAnim = {
      keyframes,
      options,
      onfinish: null,
      cancel: vi.fn(),
      reverse: vi.fn(),
      finish() {
        this.onfinish?.();
      },
    };
    anims.push(a);
    return a as unknown as Animation;
  }) as unknown as typeof Element.prototype.animate;
}

function mountCard(id = "d1") {
  const card = document.createElement("button");
  card.setAttribute("data-morph-id", id);
  card.innerHTML = `<h3 data-morph-title>Título</h3>`;
  card.getBoundingClientRect = () =>
    ({ top: 200, left: 100, width: 240, height: 100, right: 340, bottom: 300 }) as DOMRect;
  document.body.appendChild(card);
  return card;
}

function setReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

function ui(props: Partial<React.ComponentProps<typeof MorphWindow>> = {}) {
  return (
    <MorphWindow
      open
      onOpenChange={() => {}}
      morphId="d1"
      title="Banner do site"
      eyebrow="Demanda #ABC · Bella Clinic"
      chips={<span>Em produção</span>}
      rail={<p>Andamento</p>}
      footer={<button>Fechar</button>}
      {...props}
    >
      <p>Briefing</p>
    </MorphWindow>
  );
}

beforeEach(() => {
  document.body.innerHTML = "";
  setReducedMotion(false);
});

afterEach(() => {
  cleanup();
  // @ts-expect-error restaura o ambiente sem Web Animations
  delete Element.prototype.animate;
});

describe("MorphWindow sem Web Animations (jsdom, navegadores antigos)", () => {
  it("abre direto, com título, descrição e regiões", () => {
    render(ui());
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Banner do site" })).toBeTruthy();
    expect(screen.getByText("Andamento")).toBeTruthy();
    expect(screen.getByText("Briefing")).toBeTruthy();
    expect(screen.getByText("Em produção")).toBeTruthy();
  });

  it("não renderiza nada fechado", () => {
    render(ui({ open: false }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape fecha na hora e avisa o pai", () => {
    const onOpenChange = vi.fn();
    render(ui({ onOpenChange }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("o botão Fechar da barra de título fecha", () => {
    const onOpenChange = vi.fn();
    render(ui({ onOpenChange }));
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("o pai fechando (open=false) tira a janela sem chamar onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(ui({ onOpenChange }));
    rerender(ui({ onOpenChange, open: false }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("mostra o esqueleto no painel enquanto carrega", () => {
    render(ui({ loading: true }));
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByText("Briefing")).toBeNull();
  });
});

describe("MorphWindow com Web Animations", () => {
  it("abre crescendo do card: casca, fundo, título, revelação e clone", () => {
    installAnimate();
    const card = mountCard();
    render(ui());

    const shellAnim = anims.find((a) => a.keyframes.some((k) => "borderRadius" in k));
    expect(shellAnim).toBeTruthy();
    // Começa no retângulo do card.
    expect(shellAnim!.keyframes[0]).toMatchObject({ top: "200px", left: "100px", width: "240px", height: "100px" });
    expect(shellAnim!.options.duration).toBe(460);
    // Título, fundo e clone participam.
    expect(anims.some((a) => a.keyframes.some((k) => typeof k.transform === "string" && k.transform.includes("scale")))).toBe(true);
    expect(document.querySelector("[data-morph-ghost]")).not.toBeNull();
    // Card original some enquanto o clone/janela ocupam o lugar.
    expect(card.hasAttribute("data-morphing")).toBe(true);

    act(() => shellAnim!.finish());
    // Terminou: limpa tudo e devolve o card.
    expect(document.querySelector("[data-morph-ghost]")).toBeNull();
    expect(card.hasAttribute("data-morphing")).toBe(false);
    expect(anims.every((a) => a.cancel.mock.calls.length > 0)).toBe(true);
  });

  it("o título parte da posição do título do card (medido antes de animar)", () => {
    installAnimate();
    const card = mountCard();
    const cardTitle = card.querySelector<HTMLElement>("[data-morph-title]")!;
    cardTitle.style.fontSize = "14px";
    cardTitle.getBoundingClientRect = () =>
      ({ top: 215, left: 114, width: 100, height: 20, right: 214, bottom: 235 }) as DOMRect;
    // Simula o layout real: depois que a primeira animação existe, a casca já
    // está sobre o card e o título da janela "aparece" 700px mais à direita.
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this.hasAttribute("data-morph-window-title")) {
        const left = anims.length === 0 ? 225 : 977;
        return { top: 135, left, width: 400, height: 22, right: left + 400, bottom: 157 } as DOMRect;
      }
      return original.call(this);
    };
    try {
      render(ui());
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
    // jsdom 1024x768: janela 928x660 em (48, 54). Card em (100, 200).
    // Título da janela, com a casca sobre o card: (100 + 225 - 48, 200 + 135 - 54) = (277, 281).
    // Título do card em (114, 215): deslocamento (-163, -66).
    const titleAnim = anims.find((a) =>
      a.keyframes.some((k) => typeof k.transform === "string" && k.transform.includes("translate("))
    );
    expect(titleAnim).toBeTruthy();
    expect(String(titleAnim!.keyframes[0].transform)).toMatch(/^translate\(-163px, -66px\) scale\(/);
  });

  it("o título do clone fica oculto para não duplicar o da janela", () => {
    installAnimate();
    mountCard();
    render(ui());
    const ghostTitle = document.querySelector<HTMLElement>("[data-morph-ghost] [data-morph-title]");
    expect(ghostTitle?.style.visibility).toBe("hidden");
  });

  it("Escape anima o fechamento e só avisa o pai quando termina", () => {
    installAnimate();
    mountCard();
    const onOpenChange = vi.fn();
    render(ui({ onOpenChange }));
    act(() => anims.find((a) => a.keyframes.some((k) => "borderRadius" in k))!.finish());
    const before = anims.length;

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(anims.length).toBeGreaterThan(before);

    const closing = anims.slice(before).find((a) => a.options.duration === 300 && a.keyframes.some((k) => "borderRadius" in k));
    expect(closing).toBeTruthy();
    // Termina no retângulo do card.
    expect(closing!.keyframes[1]).toMatchObject({ top: "200px", left: "100px" });
    act(() => closing!.finish());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("fechar duas vezes seguidas é idempotente", () => {
    installAnimate();
    mountCard();
    const onOpenChange = vi.fn();
    render(ui({ onOpenChange }));
    act(() => anims.find((a) => a.keyframes.some((k) => "borderRadius" in k))!.finish());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    const count = anims.length;
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(anims.length).toBe(count);
  });

  it("fechar no meio da abertura roda o movimento ao contrário", () => {
    installAnimate();
    mountCard();
    const onOpenChange = vi.fn();
    render(ui({ onOpenChange }));
    const opening = [...anims];

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    opening.forEach((a) => expect(a.reverse).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
    act(() => opening[0].finish());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sem card na tela, abre com fade e não cria clone", () => {
    installAnimate();
    render(ui({ morphId: "nao-existe" }));
    expect(document.querySelector("[data-morph-ghost]")).toBeNull();
    expect(anims.some((a) => a.keyframes.some((k) => "borderRadius" in k))).toBe(false);
    expect(anims.length).toBeGreaterThan(0);
  });

  it("card fora da tela cai no fade em vez de crescer de um canto invisível", () => {
    installAnimate();
    const card = mountCard();
    card.getBoundingClientRect = () =>
      ({ top: 5000, left: 100, width: 240, height: 100, right: 340, bottom: 5100 }) as DOMRect;
    render(ui());
    expect(anims.some((a) => a.keyframes.some((k) => "borderRadius" in k))).toBe(false);
    expect(document.querySelector("[data-morph-ghost]")).toBeNull();
  });

  it("movimento reduzido: só opacidade, sem geometria nem clone", () => {
    installAnimate();
    setReducedMotion(true);
    const card = mountCard();
    render(ui());
    expect(anims.length).toBeGreaterThan(0);
    for (const a of anims) {
      for (const k of a.keyframes) {
        expect("borderRadius" in k).toBe(false);
        expect("transform" in k).toBe(false);
      }
    }
    expect(document.querySelector("[data-morph-ghost]")).toBeNull();
    expect(card.hasAttribute("data-morphing")).toBe(false);
  });

  it("desmontar no meio da animação devolve o card e remove o clone", () => {
    installAnimate();
    const card = mountCard();
    const { unmount } = render(ui());
    expect(card.hasAttribute("data-morphing")).toBe(true);
    unmount();
    expect(card.hasAttribute("data-morphing")).toBe(false);
    expect(document.querySelector("[data-morph-ghost]")).toBeNull();
  });
});
