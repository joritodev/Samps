"use client";

import { useEffect, useState } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Syne:wght@400;500;600;700;800&family=Geist+Mono&family=Newsreader:ital@1&display=swap";

/**
 * Auth shell: Vibe DS + tema Samps (dark estilo Nebula por padrão).
 * Remove assets ao sair para não afetar a intranet.
 */
export function VibeAuthShell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prevTheme = document.documentElement.dataset.theme;
    const hadDarkClass = document.documentElement.classList.contains("dark");

    const preconnectGoogle = document.createElement("link");
    preconnectGoogle.rel = "preconnect";
    preconnectGoogle.href = "https://fonts.googleapis.com";
    preconnectGoogle.id = "vibe-preconnect-google";

    const preconnectGstatic = document.createElement("link");
    preconnectGstatic.rel = "preconnect";
    preconnectGstatic.href = "https://fonts.gstatic.com";
    preconnectGstatic.crossOrigin = "anonymous";
    preconnectGstatic.id = "vibe-preconnect-gstatic";

    const fonts = document.createElement("link");
    fonts.rel = "stylesheet";
    fonts.href = FONT_HREF;
    fonts.id = "vibe-fonts";

    const ds = document.createElement("link");
    ds.rel = "stylesheet";
    ds.href = "/design-system/index.css";
    ds.id = "vibe-design-system";

    const samps = document.createElement("link");
    samps.rel = "stylesheet";
    samps.href = "/design-system/themes/samps-login.css";
    samps.id = "vibe-samps-theme";

    document.head.append(
      preconnectGoogle,
      preconnectGstatic,
      fonts,
      ds,
      samps
    );

    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("dark");
    setReady(true);

    return () => {
      document.getElementById("vibe-preconnect-google")?.remove();
      document.getElementById("vibe-preconnect-gstatic")?.remove();
      document.getElementById("vibe-fonts")?.remove();
      document.getElementById("vibe-design-system")?.remove();
      document.getElementById("vibe-samps-theme")?.remove();
      if (prevTheme) {
        document.documentElement.dataset.theme = prevTheme;
      } else {
        delete document.documentElement.dataset.theme;
      }
      if (!hadDarkClass) {
        document.documentElement.classList.remove("dark");
      }
    };
  }, []);

  function handleThemeChange(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <div
      className="vibe-auth-shell"
      style={{
        minHeight: "100dvh",
        background: ready ? "var(--bg-base)" : "#0b0f1a",
        color: ready ? "var(--fg-default)" : "#f5f5f5",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 50,
        }}
      >
        <AnimatedThemeToggler
          theme={theme}
          onThemeChange={handleThemeChange}
          className="samps-theme-toggler"
        />
      </div>
      {children}
    </div>
  );
}
