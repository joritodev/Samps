import { describe, expect, it } from "vitest";
import { resolveMentionedUserIds } from "./mentions.service";

const candidates = [
  { id: "maria", name: "Maria Silva" },
  { id: "joao", name: " Joao " },
  { id: "ana", name: "Ana" },
];

describe("resolveMentionedUserIds", () => {
  it("casa case-insensitive com trim e preserva ordem", () => {
    expect(
      resolveMentionedUserIds(["  maria silva ", "JOAO"], candidates)
    ).toEqual(["maria", "joao"]);
  });

  it("deduplica o mesmo usuario mencionado duas vezes", () => {
    expect(resolveMentionedUserIds(["joao", "JOAO"], candidates)).toEqual([
      "joao",
    ]);
  });

  it("nao inclui o autor nem usuarios inexistentes", () => {
    expect(
      resolveMentionedUserIds(["Ana", "Ninguem", "Joao"], candidates, "ana")
    ).toEqual(["joao"]);
  });

  it("devolve vazio sem tokens ou candidatos", () => {
    expect(resolveMentionedUserIds([], candidates)).toEqual([]);
    expect(resolveMentionedUserIds(["Ana"], [])).toEqual([]);
  });
});
