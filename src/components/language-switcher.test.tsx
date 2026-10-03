import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ListsProvider } from "@/components/lists-provider";
import { i18n } from "@/i18n";
import { localeStorageKey } from "@/i18n/locale";
import { createRepository } from "@/lib/storage";
import { ListsPage } from "@/routes/lists-page";
import { RootLayout } from "@/routes/root-layout";
import { memoryStorage } from "@/test/memory-storage";

function renderApp() {
  const router = createMemoryRouter([
    {
      Component: RootLayout,
      children: [{ index: true, Component: ListsPage }],
    },
  ]);
  render(
    <ListsProvider repository={createRepository(() => memoryStorage().storage)}>
      <RouterProvider router={router} />
    </ListsProvider>,
  );
}

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("switches the language without a reload and remembers the choice", async () => {
    renderApp();
    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(screen.getByRole("heading", { name: "목록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "한국어" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(document.documentElement.lang).toBe("ko");
    expect(localStorage.getItem(localeStorageKey)).toBe("ko");
  });
});
