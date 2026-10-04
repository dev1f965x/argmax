import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ListsProvider } from "@/components/lists-provider";
import { i18n } from "@/i18n";
import { createRepository, type StoredState, storageKey } from "@/lib/storage";
import { memoryStorage } from "@/test/memory-storage";
import { ListPage } from "./list-page";
import { ListsPage } from "./lists-page";
import { NotFoundPage } from "./not-found-page";
import { PrivacyPage } from "./privacy-page";
import { RootLayout } from "./root-layout";

function renderApp(path = "/") {
  const state: StoredState = {
    schemaVersion: 1,
    lists: [
      {
        id: "lunch",
        name: "Lunch",
        items: [],
        createdAt: "2026-10-04T00:00:00.000Z",
        updatedAt: "2026-10-04T00:00:00.000Z",
      },
    ],
  };
  const { storage } = memoryStorage({ [storageKey]: JSON.stringify(state) });
  const router = createMemoryRouter(
    [
      {
        Component: RootLayout,
        children: [
          { index: true, Component: ListsPage },
          { path: "lists/:id", Component: ListPage },
          { path: "privacy", Component: PrivacyPage },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <ListsProvider repository={createRepository(() => storage)}>
      <RouterProvider router={router} />
    </ListsProvider>,
  );
  return { user: userEvent.setup(), router };
}

describe("RootLayout navigation", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it.each([
    ["/", "Lists – Argmax"],
    ["/lists/lunch", "Lunch – Argmax"],
    ["/privacy", "Privacy – Argmax"],
    ["/missing", "Page not found – Argmax"],
    ["/lists/missing", "Page not found – Argmax"],
  ])("titles %s as %j", (path, title) => {
    renderApp(path);
    expect(document.title).toBe(title);
  });

  it("titles screens in the UI language", async () => {
    renderApp("/");
    await i18n.changeLanguage("ko");
    expect(await screen.findByRole("heading", { name: "목록" })).toBeVisible();
    expect(document.title).toBe("목록 – Argmax");
  });

  it("leaves focus alone on the first load", () => {
    renderApp("/lists/lunch");
    expect(document.body).toHaveFocus();
  });

  it("moves focus to the new screen's heading after navigation", async () => {
    const { user } = renderApp("/");

    await user.click(screen.getByRole("link", { name: /Lunch/ }));
    expect(screen.getByRole("heading", { name: "Lunch" })).toHaveFocus();

    await user.click(screen.getByRole("link", { name: "All lists" }));
    expect(screen.getByRole("heading", { name: "Lists" })).toHaveFocus();

    // A footer link stays on screen, so focus must still move.
    await user.click(screen.getByRole("link", { name: "Privacy" }));
    expect(screen.getByRole("heading", { name: "Privacy" })).toHaveFocus();
  });

  it("moves focus on Back to the first page", async () => {
    const { user, router } = renderApp("/");

    await user.click(screen.getByRole("link", { name: /Lunch/ }));
    await router.navigate(-1);

    expect(await screen.findByRole("heading", { name: "Lists" })).toHaveFocus();
  });

  it("keeps focus that the new screen moved on purpose", async () => {
    const { router } = renderApp("/lists/lunch");

    await router.navigate("/", {
      replace: true,
      state: { deletedListName: "Lunch" },
    });

    expect(await screen.findByText("Deleted “Lunch”.")).toHaveFocus();
  });
});
