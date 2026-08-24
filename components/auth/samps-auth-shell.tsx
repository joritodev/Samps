"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Providers } from "@/components/providers";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

function AuthThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span
        className="inline-flex size-10 rounded-full border border-border bg-card"
        aria-hidden
      />
    );
  }

  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <AnimatedThemeToggler
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
      theme={theme}
      onThemeChange={setTheme}
    />
  );
}

export function SampsAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="relative min-h-dvh bg-background text-foreground">
        <div className="fixed right-4 top-4 z-50">
          <AuthThemeToggle />
        </div>
        {children}
      </div>
    </Providers>
  );
}
