import { describe, expect, it } from "vitest";
import {
  clientProfileSchema,
  formatAddress,
  formatBirthDate,
  isDriveUrl,
  normalizeZip,
} from "./client-fields";

describe("normalizeZip", () => {
  it("aceita cep com mascara", () => {
    expect(normalizeZip("60175-045")).toBe("60175045");
  });
  it("rejeita tamanho errado", () => {
    expect(normalizeZip("123")).toBeNull();
  });
});

describe("isDriveUrl", () => {
  it("aceita drive e docs", () => {
    expect(isDriveUrl("https://drive.google.com/file/d/abc/view")).toBe(true);
    expect(isDriveUrl("https://docs.google.com/document/d/abc")).toBe(true);
  });
  it("recusa host e protocolo fora do esperado", () => {
    expect(isDriveUrl("https://exemplo.com/arquivo")).toBe(false);
    expect(isDriveUrl("http://drive.google.com/x")).toBe(false);
    expect(isDriveUrl("nao-e-url")).toBe(false);
  });
});

describe("formatAddress", () => {
  it("monta o endereco na ordem esperada", () => {
    expect(
      formatAddress({
        addressStreet: "Rua A",
        addressNumber: "100",
        addressDistrict: "Centro",
        addressCity: "Fortaleza",
        addressState: "CE",
        addressZip: "60175045",
      })
    ).toBe("Rua A, 100 · Centro · Fortaleza/CE · 60175-045");
  });
  it("ignora campos vazios", () => {
    expect(formatAddress({ addressCity: "Fortaleza" })).toBe("Fortaleza");
  });
});

describe("formatBirthDate", () => {
  it("formata dia/mes em UTC", () => {
    expect(formatBirthDate("1990-08-19T00:00:00.000Z")).toBe("19/08");
  });
});

describe("clientProfileSchema", () => {
  it("normaliza estado e recusa link fora do drive", () => {
    const ok = clientProfileSchema.parse({ addressState: "ce" });
    expect(ok.addressState).toBe("CE");
    expect(() =>
      clientProfileSchema.parse({ contractDocUrl: "https://exemplo.com/x" })
    ).toThrow();
  });
});
