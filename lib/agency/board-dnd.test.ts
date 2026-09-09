import { describe, expect, it } from "vitest";
import {
  moveDemandToList,
  resolveKanbanDropTarget,
} from "./board-dnd";

const COLUMNS = ["feeds", "stories", "follow"];

describe("resolveKanbanDropTarget", () => {
  it("returns null without an over target", () => {
    expect(resolveKanbanDropTarget(null, COLUMNS)).toBeNull();
  });

  it("uses the column id when dropping on an empty column droppable", () => {
    expect(
      resolveKanbanDropTarget({ id: "stories" }, COLUMNS)
    ).toBe("stories");
  });

  it("uses sortable containerId when dropping on another card", () => {
    expect(
      resolveKanbanDropTarget(
        {
          id: "demand-b",
          data: { current: { sortable: { containerId: "follow" } } },
        },
        COLUMNS
      )
    ).toBe("follow");
  });

  it("does not treat a demand id as a column", () => {
    expect(
      resolveKanbanDropTarget({ id: "demand-b" }, COLUMNS)
    ).toBeNull();
  });
});

describe("moveDemandToList", () => {
  it("moves the card to the target column and updates listId", () => {
    const grouped = {
      feeds: [{ id: "d1", listId: "feeds", title: "Feed" }],
      stories: [{ id: "d2", listId: "stories", title: "Story" }],
    };

    const next = moveDemandToList(grouped, "d1", "stories");

    expect(next.feeds.map((d) => d.id)).toEqual([]);
    expect(next.stories.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(next.stories[0]?.listId).toBe("stories");
    expect(grouped.feeds).toHaveLength(1);
  });
});
