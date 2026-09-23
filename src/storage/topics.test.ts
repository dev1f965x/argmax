import { describe, expect, it } from "vitest";
import { topicsFrom } from "./topics";

describe("topicsFrom", () => {
  it("keeps what was stored", () => {
    const stored = [{ id: "1", name: "점심 메뉴", options: [{ id: "a", name: "국밥" }] }];

    expect(topicsFrom(stored)).toEqual(stored);
  });

  it("starts empty when there is nothing, or nonsense, to read", () => {
    expect(topicsFrom(undefined)).toEqual([]);
    expect(topicsFrom("점심")).toEqual([]);
    expect(topicsFrom({ topics: [] })).toEqual([]);
  });

  it("drops a topic it cannot use and keeps the rest", () => {
    const stored = [
      { id: "1", name: "" },
      { name: "이름만 있음" },
      { id: "3", name: "주말 게임", options: "없음" },
    ];

    expect(topicsFrom(stored)).toEqual([{ id: "3", name: "주말 게임", options: [] }]);
  });

  it("drops an option it cannot use and keeps its topic", () => {
    const stored = [
      {
        id: "1",
        name: "점심 메뉴",
        options: [{ id: "a", name: "국밥" }, { id: "b" }, "파스타"],
      },
    ];

    expect(topicsFrom(stored)).toEqual([
      { id: "1", name: "점심 메뉴", options: [{ id: "a", name: "국밥" }] },
    ]);
  });
});
