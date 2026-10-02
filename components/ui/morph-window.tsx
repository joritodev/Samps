"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/theme/prefers-reduced-motion";
import {
  MORPH_TIMING,
  WINDOW_SIZES,
  clampToViewport,
  shellKeyframes,
  staggerDelay,
  titleOffset,
  visibleRatio,
  windowRect,
  type WindowRect,
} from "@/lib/motion/morph-geometry";
import {
  makeGhost,
  rectOf,
  resolveMorphOrigin,
  setMorphHidden,
} from "@/lib/motion/morph-origin";

/**
 * Janela de detalhe que cresce a partir do card clicado.
 *
 * Técnica: a "casca" fixa anima a geometria real (top/left/width/height/raio)
 * do retângulo do card até o da janela. O painel interno já tem o tamanho final
 * e só é recortado, então nada reflui nem distorce. Um clone do card some nos
 * primeiros 35%, o título viaja até a barra de título e o conteúdo aparece
 * escalonado. Sem origem visível, sem Web Animations ou com movimento reduzido,
 * cai para um fade curto. Detalhes em docs/superpowers (plano do morph).
 */

type Phase = "closed" | "opening" | "open" | "closing";

type Ctx = {
  phase: Phase;
  shell: HTMLElement | null;
  scrim: HTMLElement | null;
  anims: Animation[];
  ghost: HTMLElement | null;
  card: HTMLElement | null;
  morphId: string | null | undefined;
  size: "md" | "lg";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setRendered: (value: boolean) => void;
};

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

function reducedMotion(): boolean {
  try {
    return typeof window.matchMedia === "function" && prefersReducedMotion();
  } catch {
    return false;
  }
}

function canAnimate(el: HTMLElement | null): el is HTMLElement {
  return !!el && typeof el.animate === "function";
}

function play(
  ctx: Ctx,
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
): Animation {
  const animation = el.animate(keyframes, { fill: "both", ...options });
  ctx.anims.push(animation);
  return animation;
}

function cancelAll(ctx: Ctx) {
  ctx.anims.forEach((a) => a.cancel());
  ctx.anims = [];
  ctx.ghost?.remove();
  ctx.ghost = null;
}

/** Põe a casca e o painel interno na geometria final (inline, sem React). */
function applyGeometry(ctx: Ctx): WindowRect {
  const shell = ctx.shell as HTMLElement;
  const wr = windowRect(window.innerWidth, window.innerHeight, WINDOW_SIZES[ctx.size]);
  Object.assign(shell.style, {
    top: px(wr.top),
    left: px(wr.left),
    width: px(wr.width),
    height: px(wr.height),
    borderRadius: px(wr.radius),
  });
  const inner = shell.querySelector<HTMLElement>("[data-morph-inner]");
  if (inner) {
    inner.style.width = px(wr.width);
    inner.style.height = px(wr.height);
  }
  return wr;
}

function reveals(shell: HTMLElement) {
  return Array.from(shell.querySelectorAll<HTMLElement>("[data-morph-reveal]"));
}

function finishOpen(ctx: Ctx) {
  if (ctx.phase !== "opening") return;
  cancelAll(ctx);
  setMorphHidden(ctx.card, false);
  ctx.phase = "open";
}

function playOpen(ctx: Ctx) {
  const shell = ctx.shell as HTMLElement;
  const wr = applyGeometry(ctx);
  const origin = resolveMorphOrigin(ctx.morphId);
  ctx.card = origin?.el ?? null;

  if (!canAnimate(shell)) {
    ctx.phase = "open";
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const reduced = reducedMotion();
  const morph = !!origin && !reduced && visibleRatio(origin.rect, vw, vh) >= 0.5;

  if (!morph || !origin) {
    // Sem origem útil: fade curto (só opacidade quando há movimento reduzido).
    const duration = reduced ? 100 : 180;
    const main = play(
      ctx,
      shell,
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: "scale(0.98)" }, { opacity: 1, transform: "none" }],
      { duration, easing: MORPH_TIMING.ease }
    );
    if (ctx.scrim) {
      play(ctx, ctx.scrim, [{ opacity: 0 }, { opacity: 1 }], { duration, easing: "ease-out" });
    }
    main.onfinish = () => finishOpen(ctx);
    return;
  }

  setMorphHidden(origin.el, true);
  const from = clampToViewport(origin.rect, vw, vh);

  // Medir o título ANTES de animar: com `fill: both` a casca já nasce sobre o
  // card, e o título seria medido na posição errada.
  const titleEl = shell.querySelector<HTMLElement>("[data-morph-window-title]");
  const titleFinal = titleEl ? rectOf(titleEl) : null;
  const windowFontSize = titleEl
    ? parseFloat(getComputedStyle(titleEl).fontSize) || origin.titleFontSize || 0
    : 0;

  const main = play(ctx, shell, shellKeyframes(from, origin.radius, wr, wr.radius), {
    duration: MORPH_TIMING.open,
    easing: MORPH_TIMING.easeMorph,
  });

  if (ctx.scrim) {
    play(ctx, ctx.scrim, [{ opacity: 0 }, { opacity: 1 }], {
      duration: MORPH_TIMING.scrim,
      easing: "ease-out",
    });
  }

  if (titleEl && titleFinal && origin.titleRect && origin.titleFontSize) {
    const off = titleOffset(
      origin.titleRect,
      titleFinal,
      wr,
      from,
      origin.titleFontSize / (windowFontSize || origin.titleFontSize)
    );
    play(
      ctx,
      titleEl,
      [
        { transform: `translate(${px(off.dx)}, ${px(off.dy)}) scale(${off.scale})` },
        { transform: "none" },
      ],
      { duration: MORPH_TIMING.open, easing: MORPH_TIMING.easeMorph }
    );
  }

  reveals(shell).forEach((el, i) => {
    play(
      ctx,
      el,
      [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
      { duration: MORPH_TIMING.reveal, easing: MORPH_TIMING.ease, delay: staggerDelay(i) }
    );
  });

  const ghost = makeGhost(origin);
  document.body.appendChild(ghost);
  ctx.ghost = ghost;
  play(ctx, ghost, [{ opacity: 1 }, { opacity: 0 }], {
    duration: MORPH_TIMING.open * MORPH_TIMING.ghostShare,
    easing: "ease-out",
  });

  main.onfinish = () => finishOpen(ctx);
}

function finishClose(ctx: Ctx, notify: boolean) {
  cancelAll(ctx);
  setMorphHidden(ctx.card, false);
  ctx.shell?.removeAttribute("inert");
  ctx.phase = "closed";
  ctx.setRendered(false);
  if (notify) {
    ctx.onOpenChange(false);
  } else if (ctx.open) {
    // O pai pediu para abrir de novo durante a saída.
    setTimeout(() => {
      if (ctx.open && ctx.phase === "closed") {
        ctx.phase = "opening";
        ctx.setRendered(true);
      }
    }, 0);
  }
}

function playClose(ctx: Ctx, notify: boolean) {
  if (ctx.phase === "closing" || ctx.phase === "closed") return;
  const wasOpening = ctx.phase === "opening";
  ctx.phase = "closing";
  const shell = ctx.shell;
  const done = () => finishClose(ctx, notify);

  if (!canAnimate(shell)) {
    done();
    return;
  }
  shell.setAttribute("inert", "");

  // Fechar no meio da abertura: roda o mesmo movimento ao contrário.
  if (wasOpening && ctx.anims.length) {
    const main = ctx.anims[0];
    ctx.anims.forEach((a) => a.reverse());
    main.onfinish = done;
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const reduced = reducedMotion();
  const origin = resolveMorphOrigin(ctx.morphId);
  const morph = !!origin && !reduced && visibleRatio(origin.rect, vw, vh) >= 0.5;

  if (!morph || !origin) {
    const duration = reduced ? 100 : 160;
    const main = play(
      ctx,
      shell,
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.98)" }],
      { duration, easing: MORPH_TIMING.ease }
    );
    if (ctx.scrim) {
      play(ctx, ctx.scrim, [{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out" });
    }
    main.onfinish = done;
    return;
  }

  ctx.card = origin.el;
  setMorphHidden(origin.el, true);
  const current = rectOf(shell);
  const currentRadius = parseFloat(getComputedStyle(shell).borderTopLeftRadius) || 0;
  const to = clampToViewport(origin.rect, vw, vh);
  const titleEl = shell.querySelector<HTMLElement>("[data-morph-window-title]");
  const titleNow = titleEl ? rectOf(titleEl) : null;

  const main = play(ctx, shell, shellKeyframes(current, currentRadius, to, origin.radius), {
    duration: MORPH_TIMING.close,
    easing: MORPH_TIMING.easeMorph,
  });

  if (ctx.scrim) {
    play(ctx, ctx.scrim, [{ opacity: 1 }, { opacity: 0 }], {
      duration: MORPH_TIMING.close,
      easing: "ease-out",
    });
  }

  if (titleEl && titleNow && origin.titleRect && origin.titleFontSize) {
    const windowFontSize = parseFloat(getComputedStyle(titleEl).fontSize) || origin.titleFontSize;
    const off = titleOffset(origin.titleRect, titleNow, current, to, origin.titleFontSize / windowFontSize);
    play(
      ctx,
      titleEl,
      [
        { transform: "none" },
        { transform: `translate(${px(off.dx)}, ${px(off.dy)}) scale(${off.scale})` },
      ],
      { duration: MORPH_TIMING.close, easing: MORPH_TIMING.easeMorph }
    );
  }

  reveals(shell).forEach((el) => {
    play(ctx, el, [{ opacity: 1 }, { opacity: 0 }], {
      duration: MORPH_TIMING.revealOut,
      easing: "ease-out",
    });
  });

  const ghost = makeGhost(origin);
  document.body.appendChild(ghost);
  ctx.ghost = ghost;
  play(ctx, ghost, [{ opacity: 0 }, { opacity: 1 }], {
    duration: MORPH_TIMING.close * MORPH_TIMING.ghostShare,
    delay: MORPH_TIMING.close * (1 - MORPH_TIMING.ghostShare),
    easing: "ease-out",
  });

  main.onfinish = done;
}

export interface MorphWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id da demanda: acha o card de onde a janela cresce (`data-morph-id`). */
  morphId?: string | null;
  title: string;
  /** Leitura para tecnologia assistiva; cai no título quando ausente. */
  description?: string;
  /** Linha pequena sob o título (código, cliente). */
  eyebrow?: React.ReactNode;
  /** Chips de status na barra de título. */
  chips?: React.ReactNode;
  /** Coluna lateral; no celular vai acima do documento. */
  rail?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  /** Mostra um esqueleto no painel do documento enquanto os dados chegam. */
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function MorphWindow({
  open,
  onOpenChange,
  morphId,
  title,
  description,
  eyebrow,
  chips,
  rail,
  footer,
  size = "lg",
  loading,
  className,
  children,
}: MorphWindowProps) {
  const [rendered, setRendered] = React.useState(false);
  const ctx = React.useRef<Ctx>({
    phase: "closed",
    shell: null,
    scrim: null,
    anims: [],
    ghost: null,
    card: null,
    morphId,
    size,
    open,
    onOpenChange,
    setRendered,
  });
  ctx.current.morphId = morphId;
  ctx.current.size = size;
  ctx.current.open = open;
  ctx.current.onOpenChange = onOpenChange;

  React.useEffect(() => {
    const c = ctx.current;
    if (open) {
      if (c.phase === "closed") {
        c.phase = "opening";
        setRendered(true);
      }
    } else if (c.phase === "opening" || c.phase === "open") {
      playClose(c, false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!rendered) return;
    const onResize = () => {
      const c = ctx.current;
      if (c.phase === "open" && c.shell) applyGeometry(c);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rendered]);

  React.useEffect(() => {
    const c = ctx.current;
    return () => {
      cancelAll(c);
      setMorphHidden(c.card, false);
    };
  }, []);

  const setShell = React.useCallback((el: HTMLElement | null) => {
    const c = ctx.current;
    c.shell = el;
    if (el && c.phase === "opening") playOpen(c);
  }, []);

  const setScrim = React.useCallback((el: HTMLElement | null) => {
    ctx.current.scrim = el;
  }, []);

  return (
    <Dialog.Root
      open={rendered}
      onOpenChange={(value) => {
        if (!value) playClose(ctx.current, true);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          ref={setScrim}
          className="fixed inset-0 z-50 bg-[hsl(222_40%_6%/0.45)]"
        />
        <Dialog.Content
          ref={setShell}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const card = ctx.current.card;
            if (card?.isConnected) card.focus({ preventScroll: true });
          }}
          className={cn(
            "fixed z-50 isolate overflow-hidden border border-border bg-card shadow-lg outline-none",
            className
          )}
        >
          <div data-morph-inner className="absolute left-0 top-0 flex flex-col">
            <header className="flex min-h-[68px] shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/80 py-3 pl-6 pr-3 max-md:pl-4">
              <div className="min-w-0 flex-1">
                <Dialog.Title
                  data-morph-window-title
                  className="block origin-top-left truncate font-sans text-lg font-semibold leading-tight tracking-[-0.01em] text-foreground"
                >
                  {title}
                </Dialog.Title>
                {eyebrow ? (
                  <p data-morph-reveal className="mt-0.5 truncate text-xs text-muted-foreground">
                    {eyebrow}
                  </p>
                ) : null}
              </div>
              {chips ? (
                <div data-morph-reveal className="flex flex-wrap items-center gap-1.5">
                  {chips}
                </div>
              ) : null}
              <Dialog.Close
                aria-label="Fechar"
                className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-[18px]" aria-hidden />
              </Dialog.Close>
            </header>
            <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
              {rail ? (
                <aside
                  data-morph-reveal
                  className="shrink-0 border-b border-border/80 bg-muted/50 px-4 py-4 md:w-[248px] md:overflow-y-auto md:border-b-0 md:border-r md:p-5"
                >
                  {rail}
                </aside>
              ) : null}
              <div
                data-morph-reveal
                className="min-w-0 flex-1 p-4 md:overflow-y-auto md:px-7 md:py-6"
              >
                {loading ? <MorphWindowSkeleton /> : children}
              </div>
            </div>
            {footer ? (
              <footer
                data-morph-reveal
                className="flex shrink-0 flex-col gap-2 border-t border-border/80 bg-muted/50 px-5 py-3 sm:flex-row sm:justify-end"
              >
                {footer}
              </footer>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MorphWindowSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-5 w-48 animate-pulse rounded-md bg-foreground/[0.06] motion-reduce:animate-none" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-10 animate-pulse rounded-md bg-foreground/[0.06] motion-reduce:animate-none" />
        <div className="h-10 animate-pulse rounded-md bg-foreground/[0.06] motion-reduce:animate-none" />
      </div>
      <div className="h-32 animate-pulse rounded-md bg-foreground/[0.06] motion-reduce:animate-none" />
    </div>
  );
}

