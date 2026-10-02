import { describe, expect, it } from "vitest";
import { previewPosition } from "@/components/board/board-cover-cropper";

describe("previewPosition", () => {
  it("recorte de largura total mostra o fundo na largura 100%", () => {
    const p = previewPosition({ x: 0, y: 0.5, w: 1 }, 3000, 2000);
    expect(p.size).toBe("100.000% auto");
    expect(p.position.startsWith("0%")).toBe(true);
  });
  it("zoom 2x amplia o fundo e acompanha a posição", () => {
    const p = previewPosition({ x: 0.5, y: 0, w: 0.5 }, 3000, 2000);
    expect(p.size).toBe("200.000% auto");
    expect(p.position.startsWith("100%")).toBe(true);
  });
});
