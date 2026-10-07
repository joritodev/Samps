import { describe, expect, it } from "vitest";
import { hashResetToken, validatePassword } from "./password-policy";

describe("validatePassword", () => {
  it("recusa curta, vazia e não-texto", () => {
    expect(validatePassword("1")).toMatch(/ao menos 8/);
    expect(validatePassword("")).toMatch(/ao menos 8/);
    expect(validatePassword(undefined)).toMatch(/ao menos 8/);
    expect(validatePassword("1234567")).toMatch(/ao menos 8/);
  });
  it("aceita de 8 a 128", () => {
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword("a".repeat(128))).toBeNull();
    expect(validatePassword("a".repeat(129))).toMatch(/no máximo 128/);
  });
});

describe("hashResetToken", () => {
  it("é determinístico e não devolve o token", () => {
    const t = "abc123";
    expect(hashResetToken(t)).toBe(hashResetToken(t));
    expect(hashResetToken(t)).not.toContain(t);
    expect(hashResetToken(t)).toHaveLength(64);
    expect(hashResetToken("outro")).not.toBe(hashResetToken(t));
  });
});
