import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "@/test/fixtures";

describe("NotFoundPage", () => {
  it("links back to the lists screen", async () => {
    const { user } = renderApp({ path: "/missing" });

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This page or list doesn’t exist."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Back to lists" }));

    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
  });
});
