"use client";

import { Check, ChevronLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { startThemeViewTransition } from "@/lib/theme/view-transition";
import { ThemePicker } from "@/components/agency/theme-picker";
import { BOARD_ACCENTS } from "@/lib/board/appearance";
import {
  applyPreferences,
  readPreferences,
  type DensityId,
} from "@/lib/theme/preferences";
import { cn } from "@/lib/utils";

function AppearancePreview({ mode }: { mode: "light" | "dark" }) {
  const isDark = mode === "dark";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border",
        isDark ? "border-white/10 bg-[#1a1d24]" : "border-zinc-200 bg-[#f4f5f7]"
      )}
    >
      <div className="flex h-24 gap-2 p-2.5">
        <div
          className={cn(
            "w-6 shrink-0 rounded-md",
            isDark ? "bg-[#111318]" : "bg-white"
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
          <div className="h-2.5 w-8 rounded-sm bg-primary" />
          <div
            className={cn(
              "h-1.5 w-full rounded-sm",
              isDark ? "bg-white/15" : "bg-zinc-300"
            )}
          />
          <div
            className={cn(
              "h-1.5 w-3/4 rounded-sm",
              isDark ? "bg-white/10" : "bg-zinc-200"
            )}
          />
          <div
            className={cn(
              "mt-auto h-8 rounded-md",
              isDark ? "bg-white/5" : "bg-white"
            )}
          />
        </div>
      </div>
    </div>
  );
}

export function ThemesSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [colorTheme, setColorTheme] = useState<string | null>(null);
  const [accent, setAccent] = useState<string | null>(null);
  const [density, setDensity] = useState<DensityId>("comfortable");

  useEffect(() => {
    setMounted(true);
    const prefs = readPreferences(document.cookie);
    setColorTheme(prefs.theme);
    setAccent(prefs.accent);
    setDensity(prefs.density);
  }, []);

  function savePrefs(next: {
    theme: string | null;
    accent: string | null;
    density: DensityId;
  }) {
    setColorTheme(next.theme);
    setAccent(next.accent);
    setDensity(next.density);
    applyPreferences(next);
  }

  const appearance = (resolvedTheme ?? theme) === "dark" ? "dark" : "light";

  function selectAppearance(
    next: "light" | "dark",
    originEl: HTMLButtonElement
  ) {
    if (appearance === next) return;

    startThemeViewTransition({
      originEl,
      apply: () => {
        document.documentElement.classList.toggle("dark", next === "dark");
        setTheme(next);
      },
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 bg-background px-6 pb-3 pt-6">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Aparência
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Modo, tema, cor de destaque e densidade. Valem só neste dispositivo.
        </p>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-10 p-6">
        <section>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                { id: "light" as const, label: "Claro" },
                { id: "dark" as const, label: "Escuro" },
              ] as const
            ).map((option) => {
              const selected = mounted && appearance === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={(e) => selectAppearance(option.id, e.currentTarget)}
                  className={cn(
                    "rounded-xl p-1 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "ring-1 ring-border"
                  )}
                >
                  <AppearancePreview mode={option.id} />
                  <p className="py-2.5 text-center text-sm font-medium text-foreground">
                    {option.label}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="theme-title" className="space-y-3">
          <div>
            <h2 id="theme-title" className="text-sm font-semibold text-foreground">
              Tema
            </h2>
            <p className="text-xs text-muted-foreground">
              Paleta completa em claro e escuro. A cor de destaque abaixo, se
              escolhida, sobrepõe a do tema.
            </p>
          </div>
          <ThemePicker
            value={colorTheme}
            ready={mounted}
            onChange={(id) => savePrefs({ theme: id, accent, density })}
          />
        </section>

        <section aria-labelledby="accent-title" className="space-y-3">
          <div>
            <h2 id="accent-title" className="text-sm font-semibold text-foreground">
              Cor de destaque
            </h2>
            <p className="text-xs text-muted-foreground">
              Botões, abas e foco. Quadros que têm cor própria mantêm a deles, e
              alertas de atraso continuam vermelhos. Com um tema ativo, vale a
              cor do tema até você escolher outra aqui.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de destaque">
            {BOARD_ACCENTS.filter((a) => !(colorTheme && a.id === "teal")).map((a) => {
              const selected = mounted && (accent ?? (colorTheme ? null : "teal")) === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => savePrefs({ theme: colorTheme, accent: a.id === "teal" ? null : a.id, density })}
                  className={cn(
                    "grid size-9 place-items-center rounded-full border border-border text-white outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  )}
                  style={{ backgroundColor: a.swatch }}
                >
                  {selected ? <Check className="size-4" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
          {colorTheme && accent ? (
            <button
              type="button"
              onClick={() => savePrefs({ theme: colorTheme, accent: null, density })}
              className="rounded-md text-xs font-medium text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Usar a cor do tema
            </button>
          ) : null}
        </section>

        <section aria-labelledby="density-title" className="space-y-3">
          <div>
            <h2 id="density-title" className="text-sm font-semibold text-foreground">
              Densidade
            </h2>
            <p className="text-xs text-muted-foreground">
              Compacta deixa os cards de demanda mais juntos, para ver mais por tela.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Densidade">
            {(
              [
                { id: "comfortable" as const, label: "Confortável" },
                { id: "compact" as const, label: "Compacta" },
              ] as const
            ).map((o) => {
              const selected = mounted && density === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => savePrefs({ theme: colorTheme, accent, density: o.id })}
                  className={cn(
                    "rounded-xl p-3 text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "ring-1 ring-border"
                  )}
                >
                  <div className="space-y-1.5" aria-hidden>
                    {[0, 1, 2].map((n) => (
                      <div
                        key={n}
                        className={cn(
                          "rounded-md border border-border bg-card",
                          o.id === "compact" ? "h-4" : "h-7"
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-2.5 text-sm font-medium text-foreground">{o.label}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
