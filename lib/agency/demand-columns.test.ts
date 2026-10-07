import { describe, expect, it } from "vitest";
import type { BoardDemand } from "@/types/board-ui";
import { groupIntoStatusColumns } from "./demand-columns";

function card(status: string): BoardDemand {
  return {
    id: status,
    title: status,
    description: null,
    status,
    priority: "Alta",
    sector: "Design",
    dueDate: null,
    materialUrl: null,
    publishedUrl: null,
    briefingLockedAt: null,
    clientName: "Cliente",
  };
}

describe("colunas do quadro geral", () => {
  it("tira aprovada e publicada de aguardando revisão", () => {
    const columns = groupIntoStatusColumns([
      card("IN_REVIEW"),
      card("APPROVED"),
      card("SCHEDULED"),
      card("PUBLISHED"),
      card("ADJUSTMENTS"),
      card("IN_PRODUCTION"),
    ]);
    const titles = (id: string) =>
      columns.find((column) => column.id === id)?.cards.map((c) => c.status);

    expect(titles("review")).toEqual(["IN_REVIEW"]);
    expect(titles("publication")).toEqual(["APPROVED", "SCHEDULED"]);
    expect(titles("done")).toEqual(["PUBLISHED"]);
    expect(titles("adjustments")).toEqual(["ADJUSTMENTS"]);
    expect(titles("production")).toEqual(["IN_PRODUCTION"]);
  });
});
