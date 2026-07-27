"use client";

import { Check, ChevronLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useColorTheme } from "@/components/theme/color-theme-provider";
import { COLOR_THEMES } from "@/lib/theme/colors";
import { startThemeViewTransition } from "@/lib/theme/view-transition";
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
  const { colorTheme, setColorTheme, mounted: colorMounted } = useColorTheme();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [appearanceMounted, setAppearanceMounted] = useState(false);

  useEffect(() => {
    setAppearanceMounted(true);
  }, []);

  const mounted = colorMounted && appearanceMounted;
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
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Temas
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Cor principal e aparência clara ou escura
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-10 p-6">
        <section>
          <h2 className="text-base font-semibold text-foreground">
            Cor do tema
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha a cor preferida do aplicativo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {COLOR_THEMES.map((option) => {
              const selected = mounted && colorTheme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  aria-pressed={selected}
                  onClick={() => setColorTheme(option.id)}
                  className={cn(
                    "relative flex size-11 items-center justify-center rounded-xl transition-shadow",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    selected && "ring-2 ring-offset-2 ring-offset-background"
                  )}
                  style={{
                    backgroundColor: option.swatch,
                    ...(selected
                      ? { boxShadow: `0 0 0 2px ${option.swatch}` }
                      : {}),
                  }}
                >
                  {selected ? (
                    <Check
                      className="size-4 text-white drop-shadow"
                      strokeWidth={2.5}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Aparência</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o modo claro ou escuro. O botão do menu só alterna entre
            estas duas aparências, mantendo a cor escolhida.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}
