import { describe, expect, it } from "vitest";
import { extractMentionTokens } from "./mention-parser";

describe("extractMentionTokens", () => {
  it("extrai nome com espaco ate a pontuacao", () => {
    expect(extractMentionTokens("Oi @Maria Silva, veja")).toEqual([
      "Maria Silva",
    ]);
  });

  it("preserva caixa distinta para o resolver deduplicar", () => {
    expect(extractMentionTokens("@joao e @JOAO")).toEqual(["joao", "JOAO"]);
  });

  it("trima, deduplica identicos e preserva ordem", () => {
    expect(extractMentionTokens("fala @ Ana  @Bruno @Ana")).toEqual([
      "Ana",
      "Bruno",
    ]);
  });

  it("devolve vazio sem mencao util", () => {
    expect(extractMentionTokens("")).toEqual([]);
    expect(extractMentionTokens("sem arroba")).toEqual([]);
    expect(extractMentionTokens("oi @, @")).toEqual([]);
  });

  it("nao trata email como mencao", () => {
    expect(extractMentionTokens("escreva ana@samps.com")).toEqual([]);
  });

  it("aceita acento e para no fim do texto", () => {
    expect(extractMentionTokens("oi @João")).toEqual(["João"]);
  });
});
