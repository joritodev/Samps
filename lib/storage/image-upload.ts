import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  COVER_MAX_WIDTH,
  cropToPixels,
  type NormalizedCrop,
} from "@/lib/board/cover-crop";

/** Abaixo do limite de corpo de requisição das funções da Vercel (4,5 MB). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MIN_IMAGE_WIDTH = 1200;
export const MAX_IMAGE_SIDE = 6000;

export type ImageKind = "jpeg" | "png" | "webp";

export class ImageUploadError extends Error {}

/** Descobre o tipo pelos bytes; nome e Content-Type enviados não valem nada. */
export function detectImageKind(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/** Valida tamanho, tipo e dimensões. Devolve as dimensões já com a orientação EXIF aplicada. */
export async function validateImage(buf: Buffer) {
  if (buf.length === 0) throw new ImageUploadError("Arquivo vazio.");
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new ImageUploadError("A imagem passa de 4 MB.");
  }
  if (!detectImageKind(buf)) {
    throw new ImageUploadError("Use uma foto JPEG, PNG ou WebP.");
  }
  let meta;
  try {
    meta = await sharp(buf, { limitInputPixels: MAX_IMAGE_SIDE * MAX_IMAGE_SIDE }).metadata();
  } catch {
    throw new ImageUploadError("Não foi possível ler a imagem.");
  }
  // Orientações 5–8 trocam largura e altura.
  const swapped = (meta.orientation ?? 1) >= 5;
  const width = (swapped ? meta.height : meta.width) ?? 0;
  const height = (swapped ? meta.width : meta.height) ?? 0;
  if (width < MIN_IMAGE_WIDTH) {
    throw new ImageUploadError(`A foto precisa ter pelo menos ${MIN_IMAGE_WIDTH}px de largura.`);
  }
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
    throw new ImageUploadError("A foto é grande demais.");
  }
  return { width, height };
}

/** Recorta, reduz e converte para WebP. Sem EXIF/GPS na saída. */
export async function processCover(buf: Buffer, crop: Partial<NormalizedCrop>) {
  const { width, height } = await validateImage(buf);
  const rect = cropToPixels(
    { x: crop.x ?? NaN, y: crop.y ?? NaN, w: crop.w ?? NaN },
    width,
    height
  );
  const out = await sharp(buf, { limitInputPixels: MAX_IMAGE_SIDE * MAX_IMAGE_SIDE })
    .rotate() // aplica a orientação EXIF antes de recortar
    .extract(rect)
    .resize({ width: Math.min(COVER_MAX_WIDTH, rect.width), withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}

/* ---------- Armazenamento ---------- */

const DEV_DIR = path.join(process.cwd(), "public", "uploads-dev");

function blobConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Só com opt-in explícito (nunca definido na Vercel): grava em public/uploads-dev. */
export function localStorageEnabled() {
  return process.env.LOCAL_IMAGE_STORAGE === "1";
}

export function newImageKey(folder: string, ownerId: string) {
  // Nome aleatório: nunca usamos o nome enviado pelo usuário.
  return `${folder}/${ownerId}/${randomUUID()}.webp`;
}

export async function putImage(key: string, data: Buffer): Promise<string> {
  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const res = await put(key, data, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return res.url;
  }
  if (!localStorageEnabled()) {
    throw new ImageUploadError("Armazenamento de imagens não configurado.");
  }
  const file = path.join(DEV_DIR, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
  return `/uploads-dev/${key}`;
}

/** Apaga best-effort: falha ao apagar não deve quebrar a troca de foto. */
export async function deleteImage(url: string): Promise<void> {
  try {
    if (url.startsWith("/uploads-dev/")) {
      if (url.includes("..")) return;
      await unlink(path.join(process.cwd(), "public", url));
      return;
    }
    if (blobConfigured()) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    /* ignorado */
  }
}
