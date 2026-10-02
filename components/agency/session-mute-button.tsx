"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MUTE_KEY = "samps:avisos-mudo";

/** Silencia o som dos pop-ups nesta sessão (fica na janela de Avisos). */
export function SessionMuteButton({ className }: { className?: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sessionStorage.getItem(MUTE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    sessionStorage.setItem(MUTE_KEY, next ? "1" : "0");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-8 shrink-0", className)}
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Ativar som dos avisos" : "Silenciar avisos"}
      title={muted ? "Som desligado nesta sessão" : "Som ligado"}
    >
      {muted ? (
        <VolumeX className="size-4" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
    </Button>
  );
}
