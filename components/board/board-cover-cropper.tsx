"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clampCrop,
  COVER_RATIO,
  cropHeightFraction,
  MIN_CROP_WIDTH,
  type NormalizedCrop,
} from "@/lib/board/cover-crop";

const KEY_STEP = 0.01;

/** Posição (em %) de um fundo ampliado para mostrar exatamente o recorte. */
export function previewPosition(crop: NormalizedCrop, imgW: number, imgH: number) {
  const h = cropHeightFraction(crop.w, imgW, imgH);
  return {
    size: `${(100 / crop.w).toFixed(3)}% auto`,
    position: `${crop.w >= 1 ? 0 : (crop.x / (1 - crop.w)) * 100}% ${
      h >= 1 ? 0 : (crop.y / (1 - h)) * 100
    }%`,
  };
}

export function BoardCoverCropper({
  open,
  onOpenChange,
  src,
  width,
  height,
  clientName,
  logoColor,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  width: number;
  height: number;
  clientName: string;
  logoColor?: string | null;
  saving: boolean;
  onConfirm: (crop: NormalizedCrop) => void;
}) {
  const [crop, setCrop] = useState<NormalizedCrop>(() => clampCrop({}, width, height));
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const h = cropHeightFraction(crop.w, width, height);
  const maxW = Math.min(1, (height * COVER_RATIO) / width);
  const minW = Math.min(MIN_CROP_WIDTH, maxW);
  const zoom = maxW === minW ? 0 : (maxW - crop.w) / (maxW - minW);
  const preview = previewPosition(crop, width, height);

  function move(dx: number, dy: number) {
    setCrop((c) => clampCrop({ ...c, x: c.x + dx, y: c.y + dy }, width, height));
  }

  function setZoom(z: number) {
    setCrop((c) => {
      const nw = maxW - z * (maxW - minW);
      const nh = cropHeightFraction(nw, width, height);
      const oh = cropHeightFraction(c.w, width, height);
      // Mantém o centro do recorte no lugar ao dar zoom.
      return clampCrop(
        { x: c.x + c.w / 2 - nw / 2, y: c.y + oh / 2 - nh / 2, w: nw },
        width,
        height
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foto da capa</DialogTitle>
          <DialogDescription>
            Arraste o retângulo (ou use as setas) para escolher qual parte da
            foto aparece na faixa. A área escurecida fica de fora.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={box}
          className="relative select-none overflow-hidden rounded-lg bg-muted"
          style={{ aspectRatio: `${width} / ${height}`, maxHeight: "46dvh", margin: "0 auto" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" draggable={false} className="size-full object-fill" />
          <div
            role="slider"
            tabIndex={0}
            aria-label="Posição do recorte da capa"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(crop.y * 100)}
            aria-valuetext={`Recorte a ${Math.round(crop.x * 100)}% da esquerda e ${Math.round(crop.y * 100)}% do topo`}
            className="absolute cursor-move touch-none rounded-[2px] border-2 border-white shadow-[0_0_0_9999px_rgba(8,14,26,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${h * 100}%`,
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              const r = box.current?.getBoundingClientRect();
              if (!d || !r) return;
              setCrop((c) =>
                clampCrop(
                  {
                    ...c,
                    x: d.x + (e.clientX - d.px) / r.width,
                    y: d.y + (e.clientY - d.py) / r.height,
                  },
                  width,
                  height
                )
              );
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? KEY_STEP * 5 : KEY_STEP;
              const keys: Record<string, [number, number]> = {
                ArrowLeft: [-step, 0],
                ArrowRight: [step, 0],
                ArrowUp: [0, -step],
                ArrowDown: [0, step],
              };
              const k = keys[e.key];
              if (k) {
                e.preventDefault();
                move(k[0], k[1]);
              }
            }}
          />
        </div>

        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          Zoom
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={zoom}
            disabled={maxW === minW}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom do recorte"
            className="h-1 w-56 accent-primary"
          />
        </label>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Como vai aparecer no quadro
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <div
              data-testid="cover-preview"
              aria-hidden
              className="w-full bg-muted"
              style={{
                aspectRatio: `${COVER_RATIO} / 1`,
                backgroundImage: `url(${src})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: preview.size,
                backgroundPosition: preview.position,
              }}
            />
            <div className="flex items-center gap-2.5 border-t border-border bg-card px-3 py-2">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-lg text-[11px] font-bold text-white"
                style={{ backgroundColor: logoColor ?? "hsl(var(--primary))" }}
              >
                {clientName.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{clientName}</p>
                <p className="text-xs text-muted-foreground">Clientes / Quadro</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={saving} onClick={() => onConfirm(clampCrop(crop, width, height))}>
            {saving ? "Enviando…" : "Usar esta foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
