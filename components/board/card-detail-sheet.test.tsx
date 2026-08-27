import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sheetSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "card-detail-sheet.tsx"),
  "utf8"
);

describe("card-detail-sheet mention hint", () => {
  it("usa placeholder pedindo @nome no comentario", () => {
    expect(sheetSource).toContain(
      'placeholder="Comentário… Use @nome para mencionar alguém."'
    );
  });
});
