import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ListsProvider } from "@/components/lists-provider";
import type { Context } from "@/lib/lists";
import { createRepository, type StoredState, storageKey } from "@/lib/storage";
import { routes } from "@/router";
import { memoryStorage } from "./memory-storage";

const fixtureDate = "2026-10-04T00:00:00.000Z";

/** Predictable ids and a clock that moves one second per call, so updates change timestamps. */
export function testContext(prefix = "id"): Context {
  let id = 0;
  let time = Date.parse(fixtureDate);
  return {
    newId: () => {
      id += 1;
      return `${prefix}-${id}`;
    },
    now: () => {
      time += 1000;
      return new Date(time);
    },
  };
}

interface ListFixture {
  id?: string;
  name: string;
  items?: string[];
  /** Weights in the order of items; 1 where missing. */
  weights?: number[];
  createdAt?: string;
}

function listsOf(lists: ListFixture[]) {
  return lists.map((list, index) => ({
    id: list.id ?? `list-${index}`,
    name: list.name,
    items: (list.items ?? []).map((text, i) => ({
      id: `item-${i}`,
      text,
      weight: list.weights?.[i] ?? 1,
    })),
    createdAt: list.createdAt ?? fixtureDate,
    updatedAt: list.createdAt ?? fixtureDate,
  }));
}

/** Stored lists as the app saves them. */
export function storedState(lists: ListFixture[]): string {
  const state: StoredState = { schemaVersion: 2, lists: listsOf(lists) };
  return JSON.stringify(state);
}

/** Stored lists as 0.1.0 saved them: schema version 1, without weights. */
export function storedStateV1(lists: Omit<ListFixture, "weights">[]): string {
  return JSON.stringify({
    schemaVersion: 1,
    lists: listsOf(lists).map((list) => ({
      ...list,
      items: list.items.map(({ id, text }) => ({ id, text })),
    })),
  });
}

/** Renders the app's real route table over in-memory storage. */
export function renderApp({
  path = "/",
  history = [],
  stored,
  storage = memoryStorage(stored === undefined ? {} : { [storageKey]: stored }),
}: {
  path?: string;
  history?: string[];
  stored?: string;
  storage?: ReturnType<typeof memoryStorage>;
} = {}) {
  const router = createMemoryRouter(routes, {
    initialEntries: [...history, path],
  });
  render(
    <ListsProvider
      repository={createRepository(() => storage.storage)}
      context={testContext()}
    >
      <RouterProvider router={router} />
    </ListsProvider>,
  );
  return { user: userEvent.setup(), router, ...storage };
}
