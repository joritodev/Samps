import { flushSync } from "react-dom";

export type ThemeTransitionVariant = "circle";

type StartThemeViewTransitionOptions = {
  /** Element that anchors the circular reveal (defaults to viewport center). */
  originEl?: HTMLElement | null;
  fromCenter?: boolean;
  duration?: number;
  /** Theme mutation — runs inside the view transition (use flushSync-friendly updates). */
  apply: () => void;
};

function circleClipPaths(
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number
): [string, string] {
  const toX = (x: number) => `${(x / viewportWidth) * 100}%`;
  const toY = (y: number) => `${(y / viewportHeight) * 100}%`;
  const point = `${toX(cx)} ${toY(cy)}`;
  const toRadius = (r: number) =>
    `${(r / (Math.hypot(viewportWidth, viewportHeight) / Math.SQRT2)) * 100}%`;

  return [
    `circle(0% at ${point})`,
    `circle(${toRadius(maxRadius)} at ${point})`,
  ];
}

/**
 * Same circular View Transition used by AnimatedThemeToggler.
 * Safe no-op fallback when the API is unavailable.
 */
export function startThemeViewTransition({
  originEl,
  fromCenter = false,
  duration = 400,
  apply,
}: StartThemeViewTransitionOptions) {
  if (document.documentElement.dataset.magicuiThemeVt === "active") {
    return;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x: number;
  let y: number;
  if (fromCenter || !originEl) {
    x = viewportWidth / 2;
    y = viewportHeight / 2;
  } else {
    const { top, left, width, height } = originEl.getBoundingClientRect();
    x = left + width / 2;
    y = top + height / 2;
  }

  const maxRadius = Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y)
  );

  const runApply = () => {
    flushSync(apply);
  };

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  if (typeof doc.startViewTransition !== "function") {
    runApply();
    return;
  }

  const clipPath = circleClipPaths(
    x,
    y,
    maxRadius,
    viewportWidth,
    viewportHeight
  );

  const root = document.documentElement;
  root.dataset.magicuiThemeVt = "active";
  root.style.setProperty("--magicui-theme-toggle-vt-duration", `${duration}ms`);
  root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0]);

  const cleanup = () => {
    delete root.dataset.magicuiThemeVt;
    root.style.removeProperty("--magicui-theme-toggle-vt-duration");
    root.style.removeProperty("--magicui-theme-vt-clip-from");
  };

  const transition = doc.startViewTransition(runApply);

  if (typeof transition?.finished?.finally === "function") {
    transition.finished.finally(cleanup).catch(() => {});
  } else {
    cleanup();
  }

  const ready = transition?.ready;
  if (ready && typeof ready.then === "function") {
    ready
      .then(() => {
        document.documentElement.animate(
          { clipPath },
          {
            duration,
            easing: "ease-in-out",
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
  }
}
