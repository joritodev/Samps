// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  installMorphOriginTracker,
  makeGhost,
  resolveMorphOrigin,
  setMorphHidden,
} from "./morph-origin";

function card(id: string, label: string, parent: HTMLElement = document.body) {
  const el = document.createElement("button");
  el.setAttribute("data-morph-id", id);
  el.innerHTML = `<span>${label}</span><h3 data-morph-title>Título ${label}</h3>`;
  el.getBoundingClientRect = () =>
    ({ top: 10, left: 10, width: 100, height: 50, right: 110, bottom: 60 }) as DOMRect;
  parent.appendChild(el);
  return el;
}

let off: () => void;
beforeEach(() => {
  document.body.innerHTML = "";
  off = installMorphOriginTracker();
});
afterEach(() => off());

describe("resolveMorphOrigin", () => {
  it("devolve null sem id ou sem elemento", () => {
    expect(resolveMorphOrigin(null)).toBeNull();
    expect(resolveMorphOrigin("nada")).toBeNull();
  });

  it("prefere o card que o usuário clicou entre duplicatas", () => {
    const a = card("d1", "grid");
    const b = card("d1", "kanban");
    b.click();
    expect(resolveMorphOrigin("d1")?.el).toBe(b);
    a.click();
    expect(resolveMorphOrigin("d1")?.el).toBe(a);
  });

  it("clique dentro de um filho marcado conta para o card", () => {
    const a = card("d1", "grid");
    a.querySelector("span")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(resolveMorphOrigin("d1")?.el).toBe(a);
  });

  it("sem clique recente usa o primeiro card encontrado (deep link)", () => {
    const a = card("d9", "unico");
    expect(resolveMorphOrigin("d9")?.el).toBe(a);
  });

  it("ignora o clone da animação", () => {
    const a = card("d1", "real");
    const origin = resolveMorphOrigin("d1")!;
    document.body.appendChild(makeGhost(origin));
    expect(resolveMorphOrigin("d1")?.el).toBe(a);
  });

  it("mede o retângulo e o do título", () => {
    card("d1", "x");
    const o = resolveMorphOrigin("d1")!;
    expect(o.rect).toEqual({ top: 10, left: 10, width: 100, height: 50 });
    expect(o.titleRect).not.toBeNull();
  });
});

describe("makeGhost / setMorphHidden", () => {
  it("o clone é inerte, sem id e com o título oculto", () => {
    card("d1", "x");
    const g = makeGhost(resolveMorphOrigin("d1")!);
    expect(g.hasAttribute("data-morph-id")).toBe(false);
    expect(g.getAttribute("aria-hidden")).toBe("true");
    expect(g.hasAttribute("inert")).toBe(true);
    expect((g.querySelector("[data-morph-title]") as HTMLElement).style.visibility).toBe("hidden");
    expect(g.style.position).toBe("fixed");
  });

  it("marca e desmarca o card original", () => {
    const a = card("d1", "x");
    setMorphHidden(a, true);
    expect(a.hasAttribute("data-morphing")).toBe(true);
    setMorphHidden(a, false);
    expect(a.hasAttribute("data-morphing")).toBe(false);
  });
});
