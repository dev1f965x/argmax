import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { NotFoundPage } from "./not-found-page";

describe("NotFoundPage", () => {
  it("links back to the lists screen", async () => {
    const router = createMemoryRouter(
      [
        { path: "/", element: <h1>Lists</h1> },
        { path: "*", Component: NotFoundPage },
      ],
      { initialEntries: ["/missing"] },
    );
    render(<RouterProvider router={router} />);

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This page or list doesn’t exist."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Back to lists" }));

    expect(screen.getByRole("heading", { name: "Lists" })).toBeInTheDocument();
  });
});
