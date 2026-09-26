import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { Topic } from "./domain/topics";
import type { TopicStore } from "./storage/topics";

function memoryStore(topics: Topic[] = []): TopicStore & { written: Topic[][] } {
  const written: Topic[][] = [];
  return {
    written,
    read: () => topics,
    write: (next) => {
      written.push([...next]);
    },
  };
}

const lunch: Topic = {
  id: "1",
  name: "점심 메뉴",
  options: [
    { id: "a", name: "국밥" },
    { id: "b", name: "파스타" },
  ],
};

/** Always the second option, so a test can state what the pick will be. */
const second = () => 1;

describe("App", () => {
  it("asks for a topic when there is none", () => {
    render(<App store={memoryStore()} />);

    expect(screen.getByText("주제가 없습니다")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "선택" })).not.toBeInTheDocument();
  });

  it("makes a topic and opens it", async () => {
    const store = memoryStore();
    render(<App store={store} />);

    await userEvent.click(screen.getByRole("button", { name: "주제 추가" }));
    await userEvent.type(screen.getByLabelText("주제 이름"), "점심 메뉴");
    await userEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByRole("heading", { name: "점심 메뉴" })).toBeInTheDocument();
    expect(store.written.at(-1)?.[0].name).toBe("점심 메뉴");
  });

  it("waits for options before it offers a pick", () => {
    render(<App store={memoryStore([{ id: "1", name: "점심 메뉴", options: [] }])} />);

    expect(screen.getByText("후보가 2개 이상 필요합니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "선택" })).toBeDisabled();
  });

  it("adds an option and counts it", async () => {
    const store = memoryStore([{ id: "1", name: "점심 메뉴", options: [] }]);
    render(<App store={store} />);

    await userEvent.type(screen.getByLabelText("후보 이름"), "국밥");
    await userEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByText("국밥")).toBeInTheDocument();
    expect(screen.getByText("1개")).toBeInTheDocument();
    expect(store.written.at(-1)?.[0].options).toHaveLength(1);
  });

  it("refuses an option it already has", async () => {
    render(<App store={memoryStore([lunch])} />);

    await userEvent.type(screen.getByLabelText("후보 이름"), "국밥");

    expect(screen.getByRole("button", { name: "추가" })).toBeDisabled();
  });

  it("picks one and offers another go", async () => {
    render(<App store={memoryStore([lunch])} random={second} />);

    await userEvent.click(screen.getByRole("button", { name: "선택" }));

    const result = screen.getByText("선택 결과").closest("section");
    expect(result && within(result).getByText("파스타")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 선택" })).toBeInTheDocument();
  });

  it("forgets the pick when the options change", async () => {
    render(<App store={memoryStore([lunch])} random={second} />);
    await userEvent.click(screen.getByRole("button", { name: "선택" }));

    await userEvent.click(screen.getByRole("button", { name: "파스타 삭제" }));

    expect(screen.queryByText("선택 결과")).not.toBeInTheDocument();
  });

  it("renames a topic in place", async () => {
    const store = memoryStore([lunch]);
    render(<App store={store} />);

    await userEvent.click(screen.getByRole("heading", { name: "점심 메뉴" }));
    const field = screen.getByLabelText("이름 변경");
    await userEvent.clear(field);
    await userEvent.type(field, "저녁 메뉴{Enter}");

    expect(screen.getByRole("heading", { name: "저녁 메뉴" })).toBeInTheDocument();
    expect(store.written.at(-1)?.[0].name).toBe("저녁 메뉴");
  });

  it("offers a removed topic back", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App store={memoryStore([lunch])} />);

    await userEvent.click(screen.getByRole("button", { name: "주제 삭제" }));
    expect(screen.getByText("주제가 없습니다")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "실행 취소" }));

    expect(screen.getByRole("heading", { name: "점심 메뉴" })).toBeInTheDocument();
    expect(screen.getByText("파스타")).toBeInTheDocument();
  });
});
