import { describe, expect, it } from "vitest";
import { csvCell, csvFromRows } from "./csv";

describe("csvCell", () => {
  it("escapa aspas, vírgula e quebra de linha", () => {
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
  it("neutraliza fórmulas", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("@SOMA(A1)")).toBe("'@SOMA(A1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell("\t=1")).toBe("'\t=1");
  });
  it("não mexe em número nem em valores negativos comuns", () => {
    expect(csvCell(12.5)).toBe("12.5");
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell("-3")).toBe("-3");
    expect(csvCell("-12,5")).toBe('"-12,5"');
    expect(csvCell("Maria")).toBe("Maria");
  });
  it("monta linhas", () => {
    expect(csvFromRows([["Nome", "Total"], ["=x", 2]])).toBe("Nome,Total\r\n'=x,2");
  });
});
