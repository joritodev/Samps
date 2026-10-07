import { describe, expect, it } from "vitest";
import { isHttpUrl, safeHref } from "./url";

describe("url", () => {
  it("aceita http e https", () => {
    expect(isHttpUrl("https://drive.google.com/file/d/1")).toBe(true);
    expect(isHttpUrl("  http://exemplo.com/a  ")).toBe(true);
  });
  it("recusa esquemas perigosos e texto solto", () => {
    for (const v of ["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "ftp://x.com", "drive.google.com/x", "", null, undefined]) {
      expect(isHttpUrl(v as string)).toBe(false);
    }
  });
  it("safeHref devolve só o que é seguro", () => {
    expect(safeHref("https://a.com")).toBe("https://a.com");
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
  });
});
