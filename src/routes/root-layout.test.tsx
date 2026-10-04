import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { renderApp, storedState } from "@/test/fixtures";

const renderAt = (path = "/") =>
  renderApp({
    path,
    stored: storedState([{ id: "lunch", name: "Lunch" }]),
  });

describe("RootLayout navigation", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it.each([
    ["/", "Lists – Argmax"],
    ["/lists/lunch", "Lunch – Argmax"],
    ["/privacy", "Privacy policy – Argmax"],
    ["/missing", "Page not found – Argmax"],
    ["/lists/missing", "Page not found – Argmax"],
  ])("titles %s as %j", (path, title) => {
    renderAt(path);
    expect(document.title).toBe(title);
  });

  it("titles screens in the UI language", async () => {
    renderAt("/");
    await i18n.changeLanguage("ko");
    expect(await screen.findByRole("heading", { name: "목록" })).toBeVisible();
    expect(document.title).toBe("목록 – Argmax");
  });

  it("leaves focus alone on the first load", () => {
    renderAt("/lists/lunch");
    expect(document.body).toHaveFocus();
  });

  it("moves focus to the new screen's heading after navigation", async () => {
    const { user } = renderAt("/");

    await user.click(screen.getByRole("link", { name: /Lunch/ }));
    expect(screen.getByRole("heading", { name: "Lunch" })).toHaveFocus();

    await user.click(screen.getByRole("link", { name: "All lists" }));
    expect(screen.getByRole("heading", { name: "Lists" })).toHaveFocus();

    // A footer link stays on screen, so focus must still move.
    await user.click(screen.getByRole("link", { name: "Privacy policy" }));
    expect(
      screen.getByRole("heading", { name: "Privacy policy" }),
    ).toHaveFocus();
  });

  it("moves focus on Back to the first page", async () => {
    const { user, router } = renderAt("/");

    await user.click(screen.getByRole("link", { name: /Lunch/ }));
    await router.navigate(-1);

    expect(await screen.findByRole("heading", { name: "Lists" })).toHaveFocus();
  });

  it("keeps focus that the new screen moved on purpose", async () => {
    const { router } = renderAt("/lists/lunch");

    await router.navigate("/", {
      replace: true,
      state: { deletedListName: "Lunch" },
    });

    expect(await screen.findByText("Deleted “Lunch”.")).toHaveFocus();
  });
});
