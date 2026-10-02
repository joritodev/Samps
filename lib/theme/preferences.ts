/**
 * Preferências pessoais de aparência (por dispositivo, em cookie): cor de destaque
 * e densidade. Mesma lógica do tema claro/escuro, que também vive no navegador.
 * Conjunto fechado de chaves; qualquer outro valor é ignorado.
 */
import { BOARD_ACCENTS } from "@/lib/board/appearance";
import { DEFAULT_THEME_ID, parseTheme, THEME_IDS } from "@/lib/theme/themes";

export const ACCENT_COOKIE = "samps-accent";
export const DENSITY_COOKIE = "samps-density";
export const THEME_COOKIE = "samps-theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** "teal" é o padrão e não grava atributo. */
export const ACCENT_IDS = BOARD_ACCENTS.map((a) => a.id) as readonly string[];
export const DENSITY_IDS = ["comfortable", "compact"] as const;
export type DensityId = (typeof DENSITY_IDS)[number];

export function parseAccent(v: unknown): string | null {
  return typeof v === "string" && v !== "teal" && ACCENT_IDS.includes(v) ? v : null;
}

export function parseDensity(v: unknown): DensityId {
  return v === "compact" ? "compact" : "comfortable";
}

function readCookie(name: string, source: string) {
  const m = source.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function readPreferences(cookieString: string) {
  return {
    theme: parseTheme(readCookie(THEME_COOKIE, cookieString)),
    accent: parseAccent(readCookie(ACCENT_COOKIE, cookieString)),
    density: parseDensity(readCookie(DENSITY_COOKIE, cookieString)),
  };
}

/** Aplica no <html> e grava o cookie (chamado só no navegador). */
export function applyPreferences(prefs: {
  theme: string | null;
  accent: string | null;
  density: DensityId;
}) {
  const root = document.documentElement;
  if (prefs.theme) root.setAttribute("data-theme", prefs.theme);
  else root.removeAttribute("data-theme");
  if (prefs.accent) root.setAttribute("data-accent", prefs.accent);
  else root.removeAttribute("data-accent");
  if (prefs.density === "compact") root.setAttribute("data-density", "compact");
  else root.removeAttribute("data-density");
  const attrs = `; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  document.cookie = `${THEME_COOKIE}=${prefs.theme ?? DEFAULT_THEME_ID}${attrs}`;
  document.cookie = `${ACCENT_COOKIE}=${prefs.accent ?? "teal"}${attrs}`;
  document.cookie = `${DENSITY_COOKIE}=${prefs.density}${attrs}`;
}

/**
 * Script inline do <head>: aplica as preferências antes da primeira pintura,
 * sem tornar o layout dinâmico (não lê cookie no servidor). A lista de chaves
 * válidas é injetada a partir das constantes acima.
 */
export const PREFERENCES_BOOT_SCRIPT = `(function(){try{
var a=${JSON.stringify(ACCENT_IDS.filter((i) => i !== "teal"))};
var c=document.cookie;
function g(n){var m=c.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}
var t=${JSON.stringify(THEME_IDS.filter((i) => i !== DEFAULT_THEME_ID))};
var x=g(${JSON.stringify(ACCENT_COOKIE)}),d=g(${JSON.stringify(DENSITY_COOKIE)}),h=g(${JSON.stringify(THEME_COOKIE)}),r=document.documentElement;
if(h&&t.indexOf(h)>-1)r.setAttribute('data-theme',h);
if(x&&a.indexOf(x)>-1)r.setAttribute('data-accent',x);
if(d==='compact')r.setAttribute('data-density','compact');
}catch(e){}})();`;
