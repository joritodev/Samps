"use client";

import { Check } from "lucide-react";
import { buildPalette } from "@/lib/theme/palette";
import { DEFAULT_THEME_ID, THEMES, type ThemeDef } from "@/lib/theme/themes";
import { cn } from "@/lib/utils";

/** Tokens do tema padrão (Samps), que não passa pelo gerador. */
const SAMPS = {
  light: { "--background": "220 20% 98%", "--card": "0 0% 100%", "--border": "220 16% 90%", "--primary": "189 85% 31%", "--shell": "220 18% 95%" },
  dark: { "--background": "222 24% 8.5%", "--card": "222 20% 11%", "--border": "220 14% 17%", "--primary": "188 70% 55%", "--shell": "222 28% 5.5%" },
} as const;

function tokensOf(theme: ThemeDef, mode: "light" | "dark") {
  return theme.id === DEFAULT_THEME_ID ? SAMPS[mode] : buildPalette(theme.hue, mode, theme.options);
}

function Mini({ theme, mode }: { theme: ThemeDef; mode: "light" | "dark" }) {
  const t = tokensOf(theme, mode);
  const c = (k: string) => `hsl(${(t as Record<string, string>)[k]})`;
  return (
    <div
      aria-hidden
      className="flex h-14 flex-1 gap-1 p-1.5"
      style={{ background: c("--shell") }}
    >
      <div className="w-3 shrink-0 rounded-[3px]" style={{ background: c("--card"), border: `1px solid ${c("--border")}` }} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[3px] p-1" style={{ background: c("--background") }}>
        <div className="h-1.5 w-6 rounded-sm" style={{ background: c("--primary") }} />
        <div className="flex-1 rounded-[3px]" style={{ background: c("--card"), border: `1px solid ${c("--border")}` }} />
      </div>
    </div>
  );
}

export function ThemePicker({
  value,
  onChange,
  ready,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  ready: boolean;
}) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      role="radiogroup"
      aria-label="Tema"
    >
      {THEMES.map((theme) => {
        const selected = ready && (value ?? DEFAULT_THEME_ID) === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(theme.id === DEFAULT_THEME_ID ? null : theme.id)}
            className={cn(
              "overflow-hidden rounded-xl text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "ring-1 ring-border"
            )}
          >
            <div className="flex">
              <Mini theme={theme} mode="light" />
              <Mini theme={theme} mode="dark" />
            </div>
            <span className="flex items-center justify-between gap-2 bg-card px-3 py-2 text-sm font-medium text-foreground">
              {theme.label}
              {selected ? <Check className="size-4 text-primary" aria-hidden /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
