"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BoardCoverCropper } from "@/components/board/board-cover-cropper";
import { type NormalizedCrop } from "@/lib/board/cover-crop";
import type { BoardCoverImage } from "@/lib/board/appearance";
import { toast } from "sonner";

const MAX_PICK_BYTES = 25 * 1024 * 1024;
const MAX_SEND_BYTES = 3.8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

/** Reduz no navegador (lado maior ≤ 2400px) para caber no limite do envio. */
async function downscale(file: File) {
  const bitmap = await createImageBitmap(file); // aplica a orientação EXIF
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 2400 / longest);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  let quality = 0.88;
  for (;;) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) throw new Error("Não foi possível preparar a imagem.");
    if (blob.size <= MAX_SEND_BYTES || quality < 0.5) return { blob, width, height };
    quality -= 0.1;
  }
}

export function BoardCoverUpload({
  clientId,
  clientName,
  brandColor,
  initial,
}: {
  clientId: string;
  clientName: string;
  brandColor?: string | null;
  initial: BoardCoverImage | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(initial);
  const [picked, setPicked] = useState<{
    blob: Blob;
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const endpoint = `/api/clientes/${clientId}/quadro/capa`;

  function closeCropper() {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
  }

  async function onPick(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Use uma foto JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_PICK_BYTES) {
      toast.error("A foto passa de 25 MB.");
      return;
    }
    try {
      const { blob, width, height } = await downscale(file);
      if (width < 1200) {
        toast.error("A foto precisa ter pelo menos 1200px de largura.");
        return;
      }
      setPicked({ blob, url: URL.createObjectURL(blob), width, height });
    } catch {
      toast.error("Não foi possível abrir essa imagem.");
    }
  }

  async function confirm(crop: NormalizedCrop) {
    if (!picked) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", picked.blob, "capa.jpg");
      body.set("x", String(crop.x));
      body.set("y", String(crop.y));
      body.set("w", String(crop.w));
      const res = await fetch(endpoint, { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        coverImage?: BoardCoverImage;
      };
      if (!res.ok || !json.coverImage) {
        toast.error(json.error ?? "Não foi possível salvar a foto.");
        return;
      }
      setCurrent(json.coverImage);
      closeCropper();
      toast.success("Foto da capa atualizada");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "Não foi possível remover a foto.");
        return;
      }
      setCurrent(null);
      toast.success("Foto removida");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Sua foto tem prioridade sobre as capas prontas. JPEG, PNG ou WebP, com
        pelo menos 1200px de largura. Você escolhe a parte que aparece.
      </p>
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current.url}
          alt="Foto de capa atual"
          width={current.w}
          height={current.h}
          className="h-12 w-full max-w-md rounded-lg border border-border object-cover"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {current ? "Trocar foto" : "Enviar foto"}
        </Button>
        {current ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
            Remover foto
          </Button>
        ) : null}
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Escolher foto da capa"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
      {picked ? (
        <BoardCoverCropper
          open
          onOpenChange={(o) => !o && closeCropper()}
          src={picked.url}
          width={picked.width}
          height={picked.height}
          clientName={clientName}
          logoColor={brandColor}
          saving={busy}
          onConfirm={confirm}
        />
      ) : null}
    </div>
  );
}
