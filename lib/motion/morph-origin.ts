/**
 * Origem do morph: de qual card a janela cresce.
 * Um listener global (fase de captura) lembra o último elemento marcado que o
 * usuário tocou. Assim a mesma demanda em dois lugares (grid, kanban, calendário)
 * abre a partir do que foi realmente clicado, e os quadros não precisam de props.
 */
import type { Rect } from "./morph-geometry";

export const MORPH_ID_ATTR = "data-morph-id";
export const MORPH_TITLE_ATTR = "data-morph-title";
export const MORPH_STATE_ATTR = "data-morphing";
export const MORPH_GHOST_ATTR = "data-morph-ghost";

/** Quanto tempo um clique continua valendo como origem. */
const TRACK_TTL_MS = 2000;

let tracked: { el: HTMLElement; id: string; at: number } | null = null;
let installs = 0;
let teardown: (() => void) | null = null;

function onInteract(event: Event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(`[${MORPH_GHOST_ATTR}]`)) return;
  const el = target.closest<HTMLElement>(`[${MORPH_ID_ATTR}]`);
  if (!el) return;
  tracked = { el, id: el.getAttribute(MORPH_ID_ATTR) ?? "", at: Date.now() };
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Enter" || event.key === " ") onInteract(event);
}

/** Liga o rastreador (contado por referência). Devolve a função que desliga. */
export function installMorphOriginTracker(): () => void {
  if (typeof document === "undefined") return () => {};
  if (installs === 0) {
    document.addEventListener("pointerdown", onInteract, true);
    document.addEventListener("click", onInteract, true);
    document.addEventListener("keydown", onKey, true);
    teardown = () => {
      document.removeEventListener("pointerdown", onInteract, true);
      document.removeEventListener("click", onInteract, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }
  installs += 1;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    installs -= 1;
    if (installs === 0) {
      teardown?.();
      teardown = null;
      tracked = null;
    }
  };
}

export type MorphOrigin = {
  el: HTMLElement;
  rect: Rect;
  radius: number;
  titleRect: Rect | null;
  titleFontSize: number | null;
};

export function rectOf(el: Element): Rect {
  const b = el.getBoundingClientRect();
  return { top: b.top, left: b.left, width: b.width, height: b.height };
}

function describe(el: HTMLElement): MorphOrigin {
  const title = el.querySelector<HTMLElement>(`[${MORPH_TITLE_ATTR}]`);
  return {
    el,
    rect: rectOf(el),
    radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
    titleRect: title ? rectOf(title) : null,
    titleFontSize: title ? parseFloat(getComputedStyle(title).fontSize) || null : null,
  };
}

function visibleInViewport(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 &&
    r.top < window.innerHeight && r.left < window.innerWidth;
}

/** Elementos marcados com este id, sem o clone usado na animação. */
function candidates(id: string): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[${MORPH_ID_ATTR}]`)
  ).filter((el) => el.getAttribute(MORPH_ID_ATTR) === id && !el.closest(`[${MORPH_GHOST_ATTR}]`));
}

/**
 * Acha a origem de uma demanda: o elemento clicado há pouco, ou o primeiro
 * visível na tela (deep links, aberturas por código). Null = sem origem.
 */
export function resolveMorphOrigin(id: string | null | undefined): MorphOrigin | null {
  if (!id || typeof document === "undefined") return null;
  if (
    tracked &&
    tracked.id === id &&
    Date.now() - tracked.at < TRACK_TTL_MS &&
    tracked.el.isConnected
  ) {
    return describe(tracked.el);
  }
  const found = candidates(id);
  const el = found.find(visibleInViewport) ?? found[0];
  return el ? describe(el) : null;
}

/** Esconde o card original enquanto o clone/janela ocupa o lugar dele. */
export function setMorphHidden(el: HTMLElement | null | undefined, hidden: boolean) {
  if (!el) return;
  if (hidden) el.setAttribute(MORPH_STATE_ATTR, "");
  else el.removeAttribute(MORPH_STATE_ATTR);
}

/** Clone inerte do card, sem id nem título (o título viaja sozinho). */
export function makeGhost(origin: MorphOrigin): HTMLElement {
  const ghost = origin.el.cloneNode(true) as HTMLElement;
  ghost.removeAttribute(MORPH_ID_ATTR);
  ghost.removeAttribute("id");
  ghost.removeAttribute(MORPH_STATE_ATTR);
  ghost.setAttribute(MORPH_GHOST_ATTR, "");
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("inert", "");
  ghost.tabIndex = -1;
  ghost.querySelectorAll<HTMLElement>(`[${MORPH_TITLE_ATTR}]`).forEach((t) => {
    t.style.visibility = "hidden";
  });
  Object.assign(ghost.style, {
    position: "fixed",
    top: `${origin.rect.top}px`,
    left: `${origin.rect.left}px`,
    width: `${origin.rect.width}px`,
    height: `${origin.rect.height}px`,
    margin: "0",
    zIndex: "55",
    pointerEvents: "none",
    opacity: "1",
    transform: "none",
  });
  return ghost;
}
