import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  detectImageKind,
  ImageUploadError,
  MAX_UPLOAD_BYTES,
  newImageKey,
  processCover,
  validateImage,
} from "@/lib/storage/image-upload";

async function photo(w = 3000, h = 2000, fmt: "jpeg" | "png" = "jpeg") {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 120, b: 160 } } })
    [fmt]()
    .toBuffer();
}

describe("detectImageKind", () => {
  it("reconhece pelos bytes", async () => {
    expect(detectImageKind(await photo(10, 10, "jpeg"))).toBe("jpeg");
    expect(detectImageKind(await photo(10, 10, "png"))).toBe("png");
    expect(
      detectImageKind(await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).webp().toBuffer())
    ).toBe("webp");
  });
  it("recusa SVG, GIF e executável renomeado", () => {
    expect(detectImageKind(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(detectImageKind(Buffer.from("GIF89a....."))).toBeNull();
    expect(detectImageKind(Buffer.from("MZ\x90\x00\x03"))).toBeNull();
  });
});

describe("validateImage", () => {
  it("aceita foto normal", async () => {
    expect(await validateImage(await photo())).toEqual({ width: 3000, height: 2000 });
  });
  it("recusa muito grande, pequena e inválida", async () => {
    await expect(validateImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0xff))).rejects.toThrow(ImageUploadError);
    await expect(validateImage(await photo(800, 600))).rejects.toThrow(/largura/);
    await expect(validateImage(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]))).rejects.toThrow(ImageUploadError);
  });
});

describe("processCover", () => {
  it("recorta na proporção da faixa, em WebP, sem EXIF", async () => {
    const withExif = await sharp(await photo())
      .withMetadata({ exif: { IFD0: { Copyright: "segredo" } } })
      .jpeg()
      .toBuffer();
    const out = await processCover(withExif, { x: 0, y: 0.4, w: 1 });
    expect(out.width).toBe(2400);
    expect(out.height).toBe(200);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });
  it("recorte absurdo é corrigido, não quebra", async () => {
    const out = await processCover(await photo(), { x: 9, y: -4, w: 50 });
    expect(out.width / out.height).toBeCloseTo(12, 0);
  });
  it("sem recorte usa o padrão centralizado", async () => {
    const out = await processCover(await photo(), {});
    expect(out.height).toBeGreaterThan(0);
  });
});

describe("newImageKey", () => {
  it("é aleatório e não usa nome enviado", () => {
    const a = newImageKey("board-covers", "b1");
    expect(a).toMatch(/^board-covers\/b1\/[0-9a-f-]{36}\.webp$/);
    expect(a).not.toBe(newImageKey("board-covers", "b1"));
  });
});
