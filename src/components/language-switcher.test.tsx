import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { localeStorageKey } from "@/i18n/locale";
import { renderApp } from "@/test/fixtures";

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
